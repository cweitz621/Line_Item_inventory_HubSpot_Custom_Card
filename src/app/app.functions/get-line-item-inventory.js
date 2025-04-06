exports.main = async (context = {}) => {
  console.log('Starting serverless function execution');
  const dealId = context.parameters?.dealId;
  console.log('Deal ID from parameters:', dealId);
  
  if (!dealId) {
    return {
      success: false,
      message: 'No deal ID was provided. Please make sure you are viewing a deal page.'
    };
  }

  try {
    // Check if access token exists
    if (!process.env.PRIVATE_APP_ACCESS_TOKEN) {
      console.error('PRIVATE_APP_ACCESS_TOKEN is not set');
      return {
        success: false,
        message: 'Authentication token is not configured.',
        error: 'Missing PRIVATE_APP_ACCESS_TOKEN'
      };
    }

    console.log('Importing HubSpot client...');
    const { Client } = await import('@hubspot/api-client');
    console.log('HubSpot client imported successfully');

    const hubspotClient = new Client({ 
      accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN 
    });
    console.log('HubSpot client initialized');

    // Get the deal with line item associations
    console.log('Getting deal with line item associations...');
    const dealData = await hubspotClient.crm.deals.basicApi.getById(
      dealId,
      ['dealname'],
      null,
      ['line_items']
    );
    console.log('Deal Response:', JSON.stringify(dealData, null, 2));

    // Debug logging for associations
    console.log('Checking associations...');
    console.log('Associations exists:', !!dealData.associations);
    if (dealData.associations) {
      console.log('All association types:', Object.keys(dealData.associations));
      console.log('Full associations object:', JSON.stringify(dealData.associations, null, 2));
    }

    // Check for line items
    let lineItemResults = [];
    if (dealData.associations) {
      // Try both possible formats
      lineItemResults = dealData.associations.line_items?.results || 
                        dealData.associations['line items']?.results || 
                        [];
    }

    console.log('Line item results found:', lineItemResults.length);
    console.log('Line item results:', JSON.stringify(lineItemResults, null, 2));

    if (lineItemResults.length === 0) {
      console.log('No line items found in associations');
      return {
        success: true,
        message: 'No line items found for this deal.',
        dealName: dealData.properties?.dealname || 'Unnamed Deal',
        lineItems: []
      };
    }

    // Get the line item IDs
    const lineItemIds = lineItemResults.map(item => item.id);
    console.log('Line Item IDs:', lineItemIds);

    // Fetch line items
    console.log('Fetching line item details...');
    const lineItems = [];
    
    for (const id of lineItemIds) {
      try {
        console.log(`Fetching line item ${id}...`);
        const properties = ['name', 'quantity', 'hs_sku'];
        const propertiesWithHistory = undefined;
        const associations = undefined;
        const archived = false;
        const idProperty = undefined;

        const lineItem = await hubspotClient.crm.lineItems.basicApi.getById(
          id,
          properties,
          propertiesWithHistory,
          associations,
          archived,
          idProperty
        );
        console.log(`Line item ${id} response:`, JSON.stringify(lineItem, null, 2));
        
        // Get inventory data from AWS DynamoDB
        let inventoryData = null;
        const sku = lineItem.properties?.hs_sku;
        if (sku) {
          try {
            console.log(`Fetching inventory data for SKU: ${sku}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const inventoryResponse = await fetch(
              `https://csz7trlekd.execute-api.us-east-1.amazonaws.com/prod/products?productId=${encodeURIComponent(sku)}`,
              { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);
            
            if (inventoryResponse.ok) {
              inventoryData = await inventoryResponse.json();
              console.log(`Raw inventory data for SKU ${sku}:`, JSON.stringify(inventoryData, null, 2));
              
              // Check if product was found
              if (inventoryData.error === 'No product found') {
                console.log(`No product found for SKU ${sku}`);
                inventoryData = { quantity: 'N/A' };
              } else {
                // The AWS API returns inventory data with 'inventory' key
                inventoryData = {
                  quantity: inventoryData.inventory
                };
              }
              console.log('Processed inventory data:', JSON.stringify(inventoryData, null, 2));
            } else {
              console.error(`Failed to fetch inventory data for SKU ${sku}:`, inventoryResponse.status);
              inventoryData = { quantity: 'N/A' };
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              console.error(`Timeout fetching inventory data for SKU ${sku}`);
            } else {
              console.error(`Error fetching inventory data for SKU ${sku}:`, error);
            }
            inventoryData = { quantity: 'N/A' };
          }
        } else {
          inventoryData = { quantity: 'N/A' };
        }
        
        lineItems.push({
          name: lineItem.properties?.name || 'Unnamed Item',
          quantity: lineItem.properties?.quantity || '1',
          sku: sku || '-',
          inventory: inventoryData || null
        });
      } catch (error) {
        console.error(`Error fetching line item ${id}:`);
        console.error('Error object:', JSON.stringify(error, null, 2));
        if (error.response) {
          console.error('Error Response Status:', error.response.status);
          console.error('Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
          console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.error('No response object in error');
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        // Continue with other line items even if one fails
        continue;
      }
    }

    console.log('All line items fetched:', lineItems.length);

    // Create a simple message
    let message = `Deal: ${dealData.properties?.dealname || 'Unnamed Deal'}\n\n`;
    message += `Found ${lineItems.length} line items:\n\n`;
    
    lineItems.forEach((item, index) => {
      message += `Line Item #${index + 1}: ${item.name} (Quantity: ${item.quantity}, SKU: ${item.sku})\n`;
    });

    return {
      success: true,
      message: message,
      lineItems: lineItems
    };

  } catch (error) {
    console.error('Error in serverless function:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return {
      success: false,
      message: 'Error fetching line items.',
      error: error.message
    };
  }
}; 