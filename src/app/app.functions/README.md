# Line Item Inventory Serverless Functions

This directory contains the serverless functions that power the Line Item Inventory HubSpot card. The main function handles fetching line items from HubSpot deals and checking their inventory levels against an external AWS API.

## Main Function: get-line-item-inventory

### Purpose
The `get-line-item-inventory.js` function serves as a bridge between HubSpot's deal line items and your external inventory system. It:
1. Retrieves line items associated with a deal
2. Fetches current inventory levels for each item
3. Returns consolidated data to the front-end card

### Function Flow
1. **Deal Validation**
   - Receives dealId from parameters
   - Validates deal existence

2. **HubSpot API Integration**
   - Authenticates with HubSpot using private app token
   - Fetches deal details with line item associations
   - Retrieves detailed line item information

3. **Inventory Check**
   - For each line item with a SKU:
     - Queries AWS API endpoint for inventory data
     - Handles timeouts and errors gracefully
     - Processes and normalizes inventory response

4. **Response Format**
```javascript
{
  success: boolean,
  message: string,
  lineItems: [
    {
      name: string,
      quantity: string,
      sku: string,
      inventory: {
        quantity: string | number
      }
    }
  ]
}
```

## Dependencies

```json
{
  "@hubspot/api-client": "^7.0.1",
  "axios": "^0.27.2"
}
```

- `@hubspot/api-client`: Official HubSpot client for API interactions
- `axios`: HTTP client for AWS API requests

## Configuration

### Required Environment Variables
- `PRIVATE_APP_ACCESS_TOKEN`: HubSpot private app access token
- `AWS_INVENTORY_API_ENDPOINT`: Your AWS API endpoint (configured in deployment)

### AWS API Requirements
The external inventory API endpoint should:
- Accept GET requests with query parameter: `productId`
- Return JSON response with structure:
```json
{
  "inventory": number
}
```
- Handle "product not found" cases with:
```json
{
  "error": "No product found"
}
```

## Error Handling

The function implements comprehensive error handling:

1. **Input Validation**
   - Missing deal ID
   - Invalid authentication token

2. **HubSpot API Errors**
   - Deal not found
   - Line item fetch failures
   - Association errors

3. **Inventory API Errors**
   - Network timeouts (10-second limit)
   - Invalid responses
   - Product not found cases

4. **Response Normalization**
   - Converts missing inventory to "N/A"
   - Handles undefined or null values

## Logging

The function includes detailed logging for debugging:
- Function execution start/end
- Deal and line item data
- API responses
- Error conditions
- Inventory fetch results

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
PRIVATE_APP_ACCESS_TOKEN=your_token_here
```

3. Test the function using HubSpot CLI:
```bash
hs project dev
```

## Deployment

The function is automatically deployed when you upload the project to HubSpot:
```bash
hs project upload
```

## Performance Considerations

- Implements timeout handling for inventory API calls
- Processes line items sequentially to avoid rate limits
- Caches HubSpot client instance
- Uses AbortController for request cancellation

## Security Notes

- Never log sensitive data like access tokens
- Validate all input parameters
- Use HTTPS for API communications
- Implement proper error responses
- Keep dependencies updated

## Troubleshooting

Common issues and solutions:

1. **Missing Line Items**
   - Verify deal has associated line items
   - Check HubSpot API permissions
   - Review association types in debug logs

2. **Inventory Not Available**
   - Confirm SKU exists in inventory system
   - Check AWS API endpoint configuration
   - Verify network connectivity

3. **Authentication Errors**
   - Validate PRIVATE_APP_ACCESS_TOKEN
   - Confirm HubSpot app scopes
   - Check token expiration

## Future Improvements

Potential enhancements to consider:
1. Batch inventory requests for better performance
2. Cache inventory results
3. Add retry logic for failed API calls
4. Implement inventory threshold warnings
5. Add detailed error reporting