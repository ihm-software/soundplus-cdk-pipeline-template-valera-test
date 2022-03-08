// import {ApplicationLoadBalancer, ApplicationProtocol} from 'aws-cdk-lib';

// import {AutoScalingGroup} from 'aws-cdk-lib/aws-autoscaling';
// import {AmazonLinuxImage, InstanceClass, InstanceSize, InstanceType, SecurityGroup, Vpc} from 'aws-cdk-lib/aws-ec2';
// import {ApplicationLoadBalancer, ApplicationProtocol} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
// import {Construct} from 'constructs';
// import {CdkStackProps} from './util/config-types';

export const createLoadBalancing = (/*scope: Construct, props: CdkStackProps*/) => {
    // const securityGroup = SecurityGroup.fromSecurityGroupId(scope, 'sg-jobApiV2', props.securityGroup as string);
    // const vpc = Vpc.fromLookup(scope, 'vpc-jobApiV2', {vpcId: props.vpc, region: props.env?.region});
    // const lb = new ApplicationLoadBalancer(scope, 'elb-jobApiV2', {
    //     vpc,
    //     internetFacing: true,
    //     securityGroup: securityGroup,
    // });
    // lb.addRedirect({
    //     sourceProtocol: ApplicationProtocol.HTTP,
    //     sourcePort: 80,
    // });
    // lb.addListener('listener-jobApiV2', {
    //     protocol: ApplicationProtocol.HTTP,
    //     open: true,
    // }).addTargets('ApplicationFleet', {
    //     port: 8080,
    //     targets: [
    //         new AutoScalingGroup(scope, 'asg-jobApiV2', {
    //             vpc,
    //             instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.MICRO),
    //             machineImage: new AmazonLinuxImage(),
    //         }),
    //     ],
    // });
};
