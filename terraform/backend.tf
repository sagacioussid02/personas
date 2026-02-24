terraform {
  backend "s3" {
    region = "us-east-2"
    # These values will be set by deployment scripts
    # For local development, they can be passed via -backend-config
  }
}