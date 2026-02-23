import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'

const cfg = new pulumi.Config('campaign-plan')

const vpcId = cfg.require('vpcId')
const privateSubnetIds = cfg.requireObject<string[]>('privateSubnetIds')
const privateRouteTableIds = cfg.requireObject<string[]>('privateRouteTableIds')

const apiSecurityGroupId = cfg.require('apiSecurityGroupId')
const dbSecurityGroupId = cfg.require('dbSecurityGroupId')

const dbHostSecretArn = cfg.require('dbHostSecretArn')
const dbUserSecretArn = cfg.require('dbUserSecretArn')
const dbPasswordSecretArn = cfg.require('dbPasswordSecretArn')
const dbNameSecretArn = cfg.require('dbNameSecretArn')

const imageTag = cfg.get('imageTag') ?? 'dev'

// 1) Security groups
const serviceSg = new aws.ec2.SecurityGroup('campaign-plan-svc-sg', {
  vpcId,
  description: 'Campaign plan ECS service SG',
  // Start permissive on egress; tighten later
  egress: [
    { protocol: '-1', fromPort: 0, toPort: 0, cidrBlocks: ['0.0.0.0/0'] },
  ],
})

// Allow inbound from company API SG to your app port (change 3000 if needed)
const appPort = 3000
new aws.ec2.SecurityGroupRule('allow-api-to-service', {
  type: 'ingress',
  securityGroupId: serviceSg.id,
  fromPort: appPort,
  toPort: appPort,
  protocol: 'tcp',
  sourceSecurityGroupId: apiSecurityGroupId,
})

// Allow service to reach DB SG on 5432
new aws.ec2.SecurityGroupRule('allow-service-to-db', {
  type: 'egress',
  securityGroupId: serviceSg.id,
  fromPort: 5432,
  toPort: 5432,
  protocol: 'tcp',
  destinationSecurityGroupId: dbSecurityGroupId,
})

// Endpoint SG: allow HTTPS from service SG
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

// 2) VPC endpoints (no NAT)
const region = aws.config.region!

// Interface endpoints (Private DNS enabled)
const interfaceServices = [
  `com.amazonaws.${region}.ecr.api`,
  `com.amazonaws.${region}.ecr.dkr`,
  `com.amazonaws.${region}.logs`,
  `com.amazonaws.${region}.secretsmanager`,
  `com.amazonaws.${region}.kms`,
  `com.amazonaws.${region}.sts`,
]

for (const svc of interfaceServices) {
  new aws.ec2.VpcEndpoint(svc.split('.').slice(-1)[0], {
    vpcId,
    serviceName: svc,
    vpcEndpointType: 'Interface',
    privateDnsEnabled: true,
    subnetIds: privateSubnetIds,
    securityGroupIds: [endpointSg.id],
  })
}

// S3 gateway endpoint (required for ECR pulls without NAT)
new aws.ec2.VpcEndpoint('s3', {
  vpcId,
  serviceName: `com.amazonaws.${region}.s3`,
  vpcEndpointType: 'Gateway',
  routeTableIds: privateRouteTableIds,
})

// 3) ECR repo
const repo = new aws.ecr.Repository('campaign-plan-repo', {
  forceDelete: true, // dev convenience; remove for prod
})

// 4) CloudWatch logs
const logGroup = new aws.cloudwatch.LogGroup('campaign-plan-logs', {
  retentionInDays: 14,
})

// 5) IAM: execution role (pull image + logs)
const execRole = new aws.iam.Role('task-exec-role', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: 'ecs-tasks.amazonaws.com',
  }),
})

new aws.iam.RolePolicyAttachment('execRolePolicy', {
  role: execRole.name,
  policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
})

// 6) IAM: task role (secrets)
const taskRole = new aws.iam.Role('task-role', {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: 'ecs-tasks.amazonaws.com',
  }),
})

new aws.iam.RolePolicy('taskRoleSecretsPolicy', {
  role: taskRole.id,
  policy: pulumi
    .all([
      dbHostSecretArn,
      dbUserSecretArn,
      dbPasswordSecretArn,
      dbNameSecretArn,
    ])
    .apply(([a, b, c, d]) =>
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['secretsmanager:GetSecretValue'],
            Resource: [a, b, c, d],
          },
          {
            Effect: 'Allow',
            Action: ['kms:Decrypt'],
            Resource: '*',
          },
        ],
      }),
    ),
})

// 7) ECS cluster
const cluster = new aws.ecs.Cluster('campaign-plan-cluster', {})

// 8) Task definition (Fargate)
const image = pulumi.interpolate`${repo.repositoryUrl}:${imageTag}`

const taskDef = new aws.ecs.TaskDefinition('taskdef', {
  family: 'campaign-plan',
  cpu: '512',
  memory: '1024',
  networkMode: 'awsvpc',
  requiresCompatibilities: ['FARGATE'],
  executionRoleArn: execRole.arn,
  taskRoleArn: taskRole.arn,
  containerDefinitions: pulumi.all([image, logGroup.name]).apply(([img, lg]) =>
    JSON.stringify([
      {
        name: 'campaign-plan',
        image: img,
        essential: true,
        portMappings: [{ containerPort: appPort, protocol: 'tcp' }],
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': lg,
            'awslogs-region': region,
            'awslogs-stream-prefix': 'ecs',
          },
        },
        // Your entrypoint expects these env vars
        secrets: [
          { name: 'DB_HOST', valueFrom: dbHostSecretArn },
          { name: 'DB_USER', valueFrom: dbUserSecretArn },
          { name: 'DB_PASSWORD', valueFrom: dbPasswordSecretArn },
          { name: 'DB_NAME', valueFrom: dbNameSecretArn },
        ],
        environment: [{ name: 'NODE_ENV', value: 'production' }],
      },
    ]),
  ),
})

// 9) ECS service (no ALB yet — just “runs”)
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
  // Give Aurora time + migrations time
  healthCheckGracePeriodSeconds: 180,
})

export const ecrRepoUrl = repo.repositoryUrl
export const ecsClusterName = cluster.name
export const ecsServiceName = service.name
