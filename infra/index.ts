import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'

export = () => {
  const config = new pulumi.Config()

  /**
   * Middle ground approach:
   * - Only deploy dev/qa/prod TODAY (no preview stacks required)
   * - Keep the code structured so adding preview later is easy:
   *   - keep `select()` helper
   *   - keep `stage` naming
   */

  const rawEnvironment = config.require('environment')

  type Environment = 'dev' | 'qa' | 'prod'

  function isEnvironment(value: string): value is Environment {
    return value === 'dev' || value === 'qa' || value === 'prod'
  }

  if (!isEnvironment(rawEnvironment)) {
    throw new Error(`Invalid environment: ${rawEnvironment}`)
  }

  const environment: Environment = rawEnvironment
  const stage = environment
  const imageUri = config.require('imageUri')

  const select = <T>(values: Record<Environment, T>): T => {
    return values[environment]
  }

  // ---- Shared VPC (copied from GP API pattern; update if needed) ----
  const vpcId = 'vpc-0763fa52c32ebcf6a'
  const vpcCidr = '10.0.0.0/16'

  const vpcSubnetIds = {
    public: ['subnet-07984b965dabfdedc', 'subnet-01c540e6428cdd8db'],
    private: ['subnet-053357b931f0524d4', 'subnet-0bb591861f72dcb7f'],
  }

  // Base SG(s) used by ECS tasks in this VPC (GP API uses this).
  // You can replace this with a dedicated SG later.
  const vpcSecurityGroupIds = ['sg-01de8d67b0f0ec787']

  // ---- DB password (set via pulumi config as a secret) ----
  // Example: pulumi config set --secret dbPassword "..."
  const dbPassword = pulumi.secret(config.require('dbPassword'))

  // ---- SQS: jobs + completed + DLQ (FIFO) ----
  const dlq = new aws.sqs.Queue('campaign-plan-dlq', {
    name: `${stage}-CampaignPlan-DLQ.fifo`,
    fifoQueue: true,
    messageRetentionSeconds: 7 * 24 * 60 * 60, // 7 days
  })

  const jobsQueue = new aws.sqs.Queue('campaign-plan-jobs', {
    name: `${stage}-CampaignPlan-Jobs.fifo`,
    fifoQueue: true,
    visibilityTimeoutSeconds: 300, // 5 minutes; tune to max job time
    messageRetentionSeconds: 7 * 24 * 60 * 60, // 7 days
    deduplicationScope: 'messageGroup',
    fifoThroughputLimit: 'perMessageGroupId',
    redrivePolicy: pulumi.jsonStringify({
      deadLetterTargetArn: dlq.arn,
      maxReceiveCount: 3,
    }),
  })

  const completedQueue = new aws.sqs.Queue('campaign-plan-completed', {
    name: `${stage}-CampaignPlan-Completed.fifo`,
    fifoQueue: true,
    messageRetentionSeconds: 7 * 24 * 60 * 60, // 7 days
    deduplicationScope: 'messageGroup',
    fifoThroughputLimit: 'perMessageGroupId',
  })

  // ---- Aurora Postgres Serverless v2 (dedicated DB) ----
  const dbName = 'campaign_plan'
  const dbUser = 'campaign_plan'

  const rdsSecurityGroup = new aws.ec2.SecurityGroup('campaign-plan-rds-sg', {
    name: `campaign-plan-${stage}-rds-sg`,
    description: 'Allow campaign-plan worker to reach its DB',
    vpcId,
    ingress: [
      // Allow from base task SGs (used by the worker task, or swapped later)
      {
        protocol: 'tcp',
        fromPort: 5432,
        toPort: 5432,
        securityGroups: vpcSecurityGroupIds,
      },
      // Optional: allow within VPC CIDR (remove if you want strict SG-only)
      {
        protocol: 'tcp',
        fromPort: 5432,
        toPort: 5432,
        cidrBlocks: [vpcCidr],
      },
    ],
    egress: [
      { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
    ],
  })

  const subnetGroup = new aws.rds.SubnetGroup('campaign-plan-db-subnet-group', {
    name: `campaign-plan-${stage}-db-subnet-group`,
    subnetIds: vpcSubnetIds.private,
    tags: { Name: `campaign-plan-${stage}-db-subnet-group` },
  })

  const dbCluster = new aws.rds.Cluster('campaign-plan-db-cluster', {
    clusterIdentifier: select({
      dev: 'campaign-plan-db-dev',
      qa: 'campaign-plan-db-qa',
      prod: 'campaign-plan-db-prod',
    }),
    engine: aws.rds.EngineType.AuroraPostgresql,
    engineMode: aws.rds.EngineMode.Provisioned,
    engineVersion: '16.8',
    databaseName: dbName,
    masterUsername: dbUser,
    masterPassword: dbPassword,
    dbSubnetGroupName: subnetGroup.name,
    vpcSecurityGroupIds: [rdsSecurityGroup.id],
    storageEncrypted: true,
    serverlessv2ScalingConfiguration: {
      minCapacity: environment === 'prod' ? 1 : 0.5,
      maxCapacity: 64,
    },
    backupRetentionPeriod: select({ dev: 7, qa: 7, prod: 14 }),
    deletionProtection: environment === 'prod',
    skipFinalSnapshot: environment !== 'prod',
    finalSnapshotIdentifier:
      environment === 'prod'
        ? `campaign-plan-db-${stage}-final-snapshot`
        : undefined,
  })

  new aws.rds.ClusterInstance('campaign-plan-db-instance', {
    clusterIdentifier: dbCluster.id,
    instanceClass: 'db.serverless',
    engine: aws.rds.EngineType.AuroraPostgresql,
    engineVersion: dbCluster.engineVersion,
  })

  // ---- Worker ECS SG (separate from base SG) ----
  const privateSubnetIds = vpcSubnetIds.private

  const workerSg = new aws.ec2.SecurityGroup('campaign-plan-worker-sg', {
    vpcId,
    description: 'Campaign plan ECS worker SG',
    egress: [
      { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
    ],
  })

  // Recommended: explicitly allow DB access from this worker SG
  new aws.ec2.SecurityGroupRule('allow-db-from-worker', {
    type: 'ingress',
    securityGroupId: rdsSecurityGroup.id,
    fromPort: 5432,
    toPort: 5432,
    protocol: 'tcp',
    sourceSecurityGroupId: workerSg.id,
  })

  const region = aws.config.region!

  // ---- Secrets Manager secret for DB_PASSWORD (so ECS can inject it) ----
  const dbPasswordSecret = new aws.secretsmanager.Secret(
    'campaign-plan-db-password-secret',
    {
      name: `CAMPAIGN_PLAN_DB_PASSWORD_${stage.toUpperCase()}`,
    },
  )

  new aws.secretsmanager.SecretVersion(
    'campaign-plan-db-password-secret-version',
    {
      secretId: dbPasswordSecret.id,
      secretString: dbPassword,
    },
  )

  // ---- Logs ----
  const logGroup = new aws.cloudwatch.LogGroup('campaign-plan-logs', {
    retentionInDays: 14,
  })

  // ---- IAM ----
  const execRole = new aws.iam.Role('campaign-plan-task-exec-role', {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
  })

  new aws.iam.RolePolicyAttachment('campaign-plan-exec-role-policy', {
    role: execRole.name,
    policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
  })

  const taskRole = new aws.iam.Role('campaign-plan-task-role', {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
  })

  new aws.iam.RolePolicy('campaign-plan-task-role-policy', {
    role: taskRole.id,
    policy: pulumi
      .all([jobsQueue.arn, completedQueue.arn, dbPasswordSecret.arn])
      .apply(([jobsArn, doneArn, pwArn]) =>
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            // Read DB password secret
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue'],
              Resource: [pwArn],
            },
            // Decrypt secrets (tighten later to key ARN if you use a CMK)
            {
              Effect: 'Allow',
              Action: ['kms:Decrypt'],
              Resource: '*',
            },
            // Consume jobs
            {
              Effect: 'Allow',
              Action: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:ChangeMessageVisibility',
              ],
              Resource: jobsArn,
            },
            // Publish completion events
            {
              Effect: 'Allow',
              Action: ['sqs:SendMessage'],
              Resource: doneArn,
            },
          ],
        }),
      ),
  })

  // ---- ECS ----
  const cluster = new aws.ecs.Cluster('campaign-plan-cluster', {})

  const taskDef = new aws.ecs.TaskDefinition('campaign-plan-taskdef', {
    family: `campaign-plan-worker-${stage}`,
    cpu: '512',
    memory: '1024',
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    executionRoleArn: execRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi
      .all([
        imageUri,
        logGroup.name,
        jobsQueue.url,
        completedQueue.url,
        dbCluster.endpoint,
        dbCluster.masterUsername,
        dbCluster.databaseName,
        dbPasswordSecret.arn,
      ])
      .apply(
        ([img, lg, jobsUrl, doneUrl, dbHost, dbUserOut, dbNameOut, pwArn]) =>
          JSON.stringify([
            {
              name: 'campaign-plan-worker',
              image: img,
              essential: true,
              logConfiguration: {
                logDriver: 'awslogs',
                options: {
                  'awslogs-group': lg,
                  'awslogs-region': region,
                  'awslogs-stream-prefix': 'ecs',
                },
              },
              environment: [
                { name: 'NODE_ENV', value: 'production' },
                { name: 'QUEUE_URL', value: jobsUrl },
                { name: 'COMPLETION_QUEUE_URL', value: doneUrl },
                { name: 'DB_HOST', value: dbHost },
                { name: 'DB_USER', value: dbUserOut },
                { name: 'DB_NAME', value: dbNameOut },
              ],
              secrets: [{ name: 'DB_PASSWORD', valueFrom: pwArn }],
            },
          ]),
      ),
  })

  const service = new aws.ecs.Service('campaign-plan-service', {
    cluster: cluster.arn,
    desiredCount: select({ dev: 1, qa: 1, prod: 2 }),
    launchType: 'FARGATE',
    taskDefinition: taskDef.arn,
    networkConfiguration: {
      assignPublicIp: false,
      subnets: privateSubnetIds,
      securityGroups: [workerSg.id],
    },
  })

  return {
    environment,
    jobsQueueUrl: jobsQueue.url,
    completedQueueUrl: completedQueue.url,
    dlqUrl: dlq.url,
    dbEndpoint: dbCluster.endpoint,
    ecsClusterName: cluster.name,
    ecsServiceName: service.name,
  }
}
