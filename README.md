# Line Item Inventory for HubSpot

A HubSpot custom card application that displays line item inventory information from an external database directly in your deals. This tool helps sales representatives quickly check inventory levels for products in their deals, with real-time inventory data from an external system. In this example, the inventory data is coming from an AWS DynamoDB database

![Untitled design](https://github.com/user-attachments/assets/24d5b319-b19d-4430-a12e-5d7e174b0683)

## Features

- Display line items associated with a HubSpot deal
- Real-time inventory checking for each line item 
- Visual warnings when ordered quantity exceeds available inventory
- Clear indication when inventory data is not available
- Responsive table layout with sorting capabilities

## Prerequisites

Before you can use this application, you need:

- An active HubSpot account
- [HubSpot CLI](https://www.npmjs.com/package/@hubspot/cli) installed and configured
- Access to HubSpot's developer projects (available in [CRM Development Tools](https://app.hubspot.com/l/whats-new/betas))
- AWS API endpoint for inventory data

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/Line_Item_Inventory_Public.git
   cd Line_Item_Inventory_Public
   ```

2. Install dependencies:
   ```bash
   cd src/app/app.functions
   npm install
   cd ../extensions
   npm install
   ```

3. Configure your environment:
   - Create a `.env` file in the root directory
   - Add your AWS API endpoint:
     ```
     AWS_INVENTORY_API_ENDPOINT=your_endpoint_here
     ```

4. Deploy to HubSpot:
   ```bash
   hs project upload
   ```

## Configuration

### AWS API Setup
The application expects an AWS API endpoint that:
- Accepts GET requests with a `productId` parameter
- Returns JSON response with an `inventory` field
- Handles proper error responses

Example API Response:
```json
{
  "inventory": 100
}
```

### HubSpot Setup
1. Create a private app in your HubSpot account
2. Enable the following scopes:
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.objects.line_items.read`
   - `crm.schemas.line_items.read`
   - `e-commerce`

## Usage

Once installed, the Line Item Inventory card will appear in your HubSpot deal records:

1. Navigate to any deal in HubSpot
2. Look for the "Line Item Inventory" card
3. Click "Get Inventory" to fetch current inventory levels
4. Review the table showing:
   - Item Name
   - SKU
   - Ordered Quantity
   - Available Inventory

The system will automatically highlight:
- Items where ordered quantity exceeds available inventory
- Items where inventory data is not available

## Development

To run the project locally:
```bash
hs project dev
```

This will start a local development server and allow you to test changes before deploying.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Built using HubSpot's Developer Projects framework
- Based on HubSpot's example project template
