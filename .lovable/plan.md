

## Plan: Update Twitter Consumer Key/Secret

### Current State
The secrets `TWITTER_CONSUMER_KEY` and `TWITTER_CONSUMER_SECRET` already exist in the project. They need to be updated with the new values you provided.

### Action Required
When I switch to implementation mode, I will use the secret update tool to replace:

1. **TWITTER_CONSUMER_KEY** → `TxWg5u2uDlX7UAgehcEcxXI2L`
2. **TWITTER_CONSUMER_SECRET** → `sX3nONH6N7aA289RFwxKKalf3a2XRgM08DzVVe7BNCGsBdP40L`

### After Update
- You will need to **disconnect and reconnect your X account** since the access tokens were generated with the old Consumer Key — they won't work with the new one.
- No code changes are needed; the edge functions already read these values from environment secrets.

### Security Note
These keys have been shared in chat. After confirming the integration works, consider regenerating them on the X Developer Portal and updating again.

