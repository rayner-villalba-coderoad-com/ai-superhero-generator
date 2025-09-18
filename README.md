<!--
title: 'AWS Simple HTTP Endpoint example in NodeJS'
description: 'This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.'
layout: Doc
framework: v4
platform: AWS
language: nodeJS
authorLink: 'https://github.com/serverless'
authorName: 'Serverless, Inc.'
authorAvatar: 'https://avatars1.githubusercontent.com/u/13742415?s=200&v=4'
-->

# CodeRoad AI Superhero Generator

A serverless application that uses AWS Lambda, API Gateway, S3, and Rekognition to generate AI-powered superhero images. Built with Node.js and the Serverless Framework and Google Nano Banana API.

## Features
- Upload images to S3 for processing
- Generate superhero images with Google Nano Banana
- Retrieve results via API endpoints

## API Endpoints
| Endpoint         | Method | Description                        |
|------------------|--------|------------------------------------|
| /upload-url      | POST   | Get a pre-signed S3 upload URL     |
| /result-url      | POST   | Get the result image URL           |

## Environment Variables
- `UPLOAD_BUCKET`: S3 bucket for uploads
- `SAGEMAKER_ENDPOINT`: SageMaker endpoint name this value comes from AWS Parameter Store
- `GOOGLE_API_KEY`: Google API key for additional features

## Usage

### Deployment

```sh
serverless deploy
```

### Local Development

```sh
serverless dev
```

### Example: Get Upload URL

```sh
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/upload-url
```

### Example: Get Result URL

```sh
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/result-url
```

## Project Structure
- `src/` - Lambda function source code
- `client/` - React Frontend Application
- `serverless.yml` - Serverless Framework config
- `layer_content.zip` - Lambda layer dependencies

## License
MIT

---

For more details, see the [Serverless Framework docs](https://www.serverless.com/framework/docs/).
