# Contract: Health Check

## Endpoint

`GET /health`

## Request

No parameters, no body, no authentication.

## Response

**Status**: `200 OK`

**Content-Type**: `application/json`

**Body**:

```json
{
  "status": "ok"
}
```

## Error Behavior

If the server is running, it always returns 200. If the server is unreachable, the connection fails at the network level (no custom error response).
