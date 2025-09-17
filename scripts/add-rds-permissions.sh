#!/bin/bash

# Add RDS permissions to testdriven-app user for Aurora Serverless v2

set -e

echo "🔐 Adding RDS permissions to testdriven-app_docker-machine-user..."

# Create RDS policy for Aurora Serverless v2
cat > /tmp/rds-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds:CreateDBCluster",
                "rds:CreateDBInstance",
                "rds:CreateDBSubnetGroup",
                "rds:DescribeDBClusters",
                "rds:DescribeDBInstances",
                "rds:DescribeDBSubnetGroups",
                "rds:ModifyDBCluster",
                "rds:DeleteDBCluster",
                "rds:DeleteDBInstance",
                "rds:AddTagsToResource",
                "rds:ListTagsForResource"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create the policy
POLICY_ARN=$(aws iam create-policy \
    --policy-name TestDrivenRDSPolicy \
    --policy-document file:///tmp/rds-policy.json \
    --query 'Policy.Arn' --output text 2>/dev/null || \
    aws iam list-policies --query 'Policies[?PolicyName==`TestDrivenRDSPolicy`].Arn' --output text)

echo "✅ Policy ARN: $POLICY_ARN"

# Attach policy to user
aws iam attach-user-policy \
    --user-name testdriven-app_docker-machine-user \
    --policy-arn "$POLICY_ARN"

echo "✅ RDS permissions added successfully!"
echo ""
echo "🚀 Now you can run: ./scripts/setup-aurora-serverless.sh"

# Clean up
rm -f /tmp/rds-policy.json
