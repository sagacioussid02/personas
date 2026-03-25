#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}          # dev | test | prod
PROJECT_NAME=${2:-twin}

echo "🚀 Deploying ${PROJECT_NAME} to ${ENVIRONMENT}..."

# 1. Build Lambda package
cd "$(dirname "$0")/.."        # project root
echo "📦 Building Lambda package..."
(cd backend && uv run deploy.py)

# 2. Terraform workspace & apply
cd terraform
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${DEFAULT_AWS_REGION:-us-east-2}
terraform init -input=false \
  -backend-config="bucket=twin-terraform-state-${AWS_ACCOUNT_ID}" \
  -backend-config="key=${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=twin-terraform-locks" \
  -backend-config="encrypt=true"

# Note: Workspaces are not used - state is managed by key path

# Use prod.tfvars for production environment
if [ "$ENVIRONMENT" = "prod" ]; then
  TF_APPLY_CMD=(terraform apply -var-file=prod.tfvars -var="project_name=$PROJECT_NAME" -var="environment=$ENVIRONMENT" -auto-approve)
else
  TF_APPLY_CMD=(terraform apply -var="project_name=$PROJECT_NAME" -var="environment=$ENVIRONMENT" -auto-approve)
fi

echo "🎯 Applying Terraform..."
"${TF_APPLY_CMD[@]}"

API_URL=$(terraform output -raw api_gateway_url)
CUSTOM_URL=$(terraform output -raw custom_domain_url 2>/dev/null || true)
S3_BUCKET=$(terraform output -raw s3_frontend_bucket 2>/dev/null || true)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url 2>/dev/null || true)

cd ..

# 3. Frontend deployment
#
# By default the frontend is deployed via Vercel (connected to the main branch).
# To deploy to S3/CloudFront instead, set DEPLOY_FRONTEND_S3=true before running
# this script.  Both the S3 bucket and CloudFront distribution are always
# provisioned by Terraform, so switching between providers only requires
# toggling the env var.
#
# Example:
#   DEPLOY_FRONTEND_S3=true ./scripts/deploy.sh prod

if [ "${DEPLOY_FRONTEND_S3:-false}" = "true" ]; then
  echo "🏗️  Building frontend for S3/CloudFront deployment..."
  (
    cd frontend
    NEXT_PUBLIC_API_URL="$API_URL" npm ci --prefer-offline
    NEXT_PUBLIC_API_URL="$API_URL" npm run build
  )

  if [ -z "$S3_BUCKET" ]; then
    echo "❌ Could not determine S3 bucket name from Terraform outputs. Skipping frontend sync."
  else
    echo "☁️  Syncing frontend/out/ to s3://${S3_BUCKET}..."
    aws s3 sync frontend/out/ "s3://${S3_BUCKET}" --delete

    if [ -n "$CLOUDFRONT_URL" ]; then
      # Invalidate CloudFront cache so the new build is served immediately
      CF_DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?DomainName=='${CLOUDFRONT_URL}'].Id | [0]" \
        --output text 2>/dev/null || true)
      if [ -n "$CF_DISTRIBUTION_ID" ] && [ "$CF_DISTRIBUTION_ID" != "None" ]; then
        echo "🔄 Invalidating CloudFront distribution ${CF_DISTRIBUTION_ID}..."
        aws cloudfront create-invalidation \
          --distribution-id "$CF_DISTRIBUTION_ID" \
          --paths "/*" > /dev/null
      fi
      echo "🌐 Frontend live at: https://${CLOUDFRONT_URL}"
    else
      echo "ℹ️  CloudFront URL not available from Terraform outputs. Skipping CloudFront invalidation."
    fi
  fi
else
  # Vercel automatically deploys from the main branch — just remind the operator
  # to ensure the API URL is wired up in the Vercel project settings.
  echo "🚀 Frontend deployed via Vercel."
  echo "   ➜ Make sure NEXT_PUBLIC_API_URL=${API_URL} is set in the Vercel project environment variables."
fi

# 4. Final messages
echo -e "\n✅ Deployment complete!"
if [ -n "$CUSTOM_URL" ]; then
  echo "🔗 Custom domain  : $CUSTOM_URL"
fi
echo "📡 API Gateway    : $API_URL"
