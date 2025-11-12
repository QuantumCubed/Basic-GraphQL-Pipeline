import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dynamoTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      tableName: "users",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const vpc = new ec2.Vpc(this, "ApplicationVPC", {
      maxAzs: 2,
      natGateways: 0,
    });

    const securityGroup = new ec2.SecurityGroup(this, "AppSecurityGroup", {
      vpc: vpc,
      description: "Allow HTTP, HTTPS, and SSH access",
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "Allow SSH"
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8000),
      "Allow Kong Gateway"
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8001),
      "Allow Kong Admin (restrict this in production!)"
    );

    const ec2Role = new iam.Role(this, "EC2DynamoDBRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
      ],
    });

    const ec2Instance = new ec2.Instance(this, "ApplicationInstance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      role: ec2Role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      keyName: "graphql-app-key",
    });

    new cdk.CfnOutput(this, "EC2PublicIP", {
      value: ec2Instance.instancePublicIp,
      description: "Public IP of EC2 instance",
    });

    new cdk.CfnOutput(this, "SSHCommand", {
      value: `ssh -i your-key-pair.pem ec2-user@${ec2Instance.instancePublicIp}`,
      description: "SSH command to connect",
    });

    new cdk.CfnOutput(this, "KongURL", {
      value: `http://${ec2Instance.instancePublicIp}:8000`,
      description: "Kong Gateway URL",
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: dynamoTable.tableName,
      description: "DynamoDB Table Name",
    });
  }
}
