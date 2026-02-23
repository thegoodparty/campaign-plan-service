import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'

const cfg = new pulumi.Config('campaign-plan')

const vpcId = cfg.require('vpcId')
const privateSubnetIds = cfg.requireObject<string[]>('privateSubnetIds')
const privateRouteTableIds = cfg.requireObject<string[]>('privateRouteTableIds')
const dbSecurityGroupId = cfg.require('dbSecurityGroupId')

const dbHostSecretArn = cfg.require('dbHostSecretArn')
const dbUserSecretArn = cfg.require('dbUserSecretArn')
const dbPasswordSecretArn = cfg.require('dbPasswordSecretArn')
const dbNameSecretArn = cfg.require('dbNameSecretArn')

const imageTag = cfg.get('imageTag') ?? 'dev'

// ---------- Queues ----------
const jobsQueue = new aws.sqs.Queue('campaign-plan-jobs', {
  // sensible defaults; tune later
  visibilityTimeoutSeconds: 300, // should exceed typical job processing time per message
  messageRetentionSeconds: 60 * 60 * 24 * 4, // 4 days
})

const completedQueue = new aws.sqs.Queue('campaign-plan-completed', {
  messageRetentionSeconds: 60 * 60 * 24 * 4,
})

// (Optional but recommended) DLQ for failed jobs
const jobsDlq = new aws.sqs.Queue('campaign-plan-jobs-dlq', {
  messageRetentionSeconds: 60 * 60 * 24 * 14,
})

new aws.sqs.RedrivePolicy('campaign-plan-jobs-redrive', {
  queueUrl: jobsQueue.url,
  redrivePolicy: pulumi.interpolate`{"deadLetterTargetArn":"${jobsDlq.arn}","maxReceiveCount":5}`,
})
// ---------- Security groups ----------
const serviceSg = new aws.ec2.SecurityGroup('campaign-plan-worker-sg', {
  vpcId,
  description: 'Campaign plan ECS worker SG',
  egress: [
    { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
  ],
})

// Allow DB SG to accept connections from worker
new aws.ec2.SecurityGroupRule('allow-db-from-worker', {
  type: 'ingress',
  securityGroupId: dbSecurityGroupId,
  fromPort: 5432,
  toPort: 5432,
  protocol: 'tcp',
  sourceSecurityGroupId: serviceSg.id,
})

// Endpoint SG: allow HTTPS from worker to interface endpoints
const endpointSg = new aws.ec2.SecurityGroup('vpce-sg', {
  vpcId,
  description: 'Allow ECS tasks to hit VPC interface endpoints',
  ingress: [
    {
      protocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      securityGroups: [serviceSg.id],
    },
  ],
  egress: [
    { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
  ],
})

// ---------- VPC endpoints (no NAT) ----------
const region = aws.config.region!

const interfaceServices = [
  `com.amazonaws.${region}.ecr.api`,
  `com.amazonaws.${region}.ecr.dkr`,
  `com.amazonaws.${region}.logs`,
  `com.amazonaws.${region}.secretsmanager`,
  `com.amazonaws.${region}.kms`,
  `com.amazonaws.${region}.sts`,
  `com.amazonaws.${region}.sqs`,
]

for (const svc of interfaceServices) {
  const name = svc.replace(`com.amazonaws.${region}.`, '').replace(/\./g, '-')
  new aws.ec2.VpcEndpoint(`vpce-${name}`, {
    vpcId,
    serviceName: svc,
    vpcEndpointType: 'Interface',
    privateDnsEnabled: true,
    subnetIds: privateSubnetIds,
    securityGroupIds: [endpointSg.id],
  })
}

// S3 gateway endpoint (needed for ECR pulls without NAT)
new aws.ec2.VpcEndpoint('vpce-s3', {
  vpcId,
  serviceName: `com.amazonaws.${region}.s3`,
  vpcEndpointType: 'Gateway',
  routeTableIds: privateRouteTableIds,
})

// ---------- ECR ----------
const repo = new aws.ecr.Repository('campaign-plan-repo', {
  forceDelete: true, // dev convenience; remove for prod
})

// ---------- Logs ----------
const logGroup = new aws.cloudwatch.LogGroup('campaign-plan-logs', {
  retentionInDays: 14,
})

// ---------- IAM Roles ----------
const execRole = new aws.iam.Role('task-exec-role', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: 'ecs-tasks.amazonaws.com',
  }),
})

new aws.iam.RolePolicyAttachment('execRolePolicy', {
  role: execRole.name,
  policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
})

const taskRole = new aws.iam.Role('task-role', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: 'ecs-tasks.amazonaws.com',
  }),
})

new aws.iam.RolePolicy('taskRolePolicy', {
  role: taskRole.id,
  policy: pulumi
    .all([
      dbHostSecretArn,
      dbUserSecretArn,
      dbPasswordSecretArn,
      dbNameSecretArn,
      jobsQueue.arn,
      completedQueue.arn,
    ])
    .apply(([a, b, c, d, jobsArn, doneArn]) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          // Secrets
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: [a, b, c, d],
          },
          // KMS decrypt for secrets (tighten later to specific key)
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
          // Publish completions
          {
            Effect: 'Allow',
            Action: ['sqs:SendMessage'],
            Resource: doneArn,
          },
        ],
      }),
    ),
})

// ---------- ECS ----------
const cluster = new aws.ecs.Cluster('campaign-plan-cluster', {})

const image = pulumi.interpolate`${repo.repositoryUrl}:${imageTag}`

const taskDef = new aws.ecs.TaskDefinition('taskdef', {
  family: 'campaign-plan-worker',
  cpu: '512',
  memory: '1024',
  networkMode: 'awsvpc',
  requiresCompatibilities: ['FARGATE'],
  executionRoleArn: execRole.arn,
  taskRoleArn: taskRole.arn,
  containerDefinitions: pulumi
    .all([image, logGroup.name, jobsQueue.url, completedQueue.url])
    .apply(([img, lg, jobsUrl, doneUrl]) =>
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
          secrets: [
            { name: 'DB_HOST', valueFrom: dbHostSecretArn },
            { name: 'DB_USER', valueFrom: dbUserSecretArn },
            { name: 'DB_PASSWORD', valueFrom: dbPasswordSecretArn },
            { name: 'DB_NAME', valueFrom: dbNameSecretArn },
          ],
          environment: [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'QUEUE_URL', value: jobsUrl },
            { name: 'COMPLETION_QUEUE_URL', value: doneUrl },
          ],
        },
      ]),
    ),
})

const service = new aws.ecs.Service('service', {
  cluster: cluster.arn,
  desiredCount: 1,
  launchType: 'FARGATE',
  taskDefinition: taskDef.arn,
  networkConfiguration: {
    assignPublicIp: false,
    subnets: privateSubnetIds,
    securityGroups: [serviceSg.id],
  },
})

// ---------- Outputs ----------
export const ecrRepoUrl = repo.repositoryUrl
export const ecsClusterName = cluster.name
export const ecsServiceName = service.name

export const jobsQueueUrl = jobsQueue.url
export const jobsQueueArn = jobsQueue.arn
export const completedQueueUrl = completedQueue.url
export const completedQueueArn = completedQueue.arn
export const jobsDlqUrl = jobsDlq.url
