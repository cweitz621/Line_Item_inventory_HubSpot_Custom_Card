import React, { useState } from "react";
import {
  Button,
  Text,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Flex,
  Heading,
  hubspot,
} from "@hubspot/ui-extensions";

// Define the extension to be run within the Hubspot CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => {
  return (
    <Extension
      context={context}
      runServerless={runServerlessFunction}
      sendAlert={actions.addAlert}
    />
  );
});

// Define the Extension component, taking in runServerless, context, & sendAlert as props
const Extension = ({ context, runServerless, sendAlert }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [dealName, setDealName] = useState('');

  const handleClick = async () => {
    const dealId = context.crm?.objectId;
    
    if (!dealId) {
      sendAlert({ 
        message: 'No deal ID found. Please make sure you are viewing a deal page.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await runServerless({
        name: "get-line-item-inventory",
        parameters: { dealId }
      });
      
      if (!result || !result.response) {
        sendAlert({ 
          message: 'No response received from server. Please try again.',
          type: 'error'
        });
        return;
      }

      const response = result.response;
      
      if (!response.success) {
        sendAlert({ 
          message: response.message || 'Error fetching deal information.',
          type: 'error'
        });
        return;
      }

      // Update state with line items and deal name
      setLineItems(response.lineItems || []);
      setDealName(response.message.split('\n')[0].replace('Deal: ', ''));

      // Check for inventory warnings
      const warnings = response.lineItems?.filter(item => 
        item.inventory?.quantity !== 'N/A' && 
        parseInt(item.quantity) > parseInt(item.inventory.quantity)
      ) || [];

      // Check for N/A inventory items
      const naItems = response.lineItems?.filter(item => 
        item.inventory?.quantity === 'N/A'
      ) || [];

      // Show warning for items exceeding inventory
      if (warnings.length > 0) {
        const warningItems = warnings.map(item => 
          `${item.name} (Ordered: ${item.quantity}, Available: ${item.inventory.quantity})`
        ).join('\n');

        sendAlert({
          message: `Warning: The following items exceed available inventory:\n${warningItems}`,
          type: 'danger'
        });
      }

      // Show warning for N/A inventory items
      if (naItems.length > 0) {
        const naItemsList = naItems.map(item => 
          `${item.name} (SKU: ${item.sku})`
        ).join('\n');

        sendAlert({
          message: `Warning: The following items have no inventory data available:\n${naItemsList}`,
          type: 'danger'
        });
      }
    } catch (error) {
      console.error('Error in handleClick:', error);
      sendAlert({ 
        message: 'Error processing request. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="small">
      <Text>
        View inventory of line items associated with this deal.
      </Text>

      <Button 
        type="submit" 
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Get Inventory'}
      </Button>

      {lineItems.length > 0 && (
        <Table
          bordered={true}
          paginated={true}
          showButtonLabels={true}
          pageCount="5"
        >
          <TableHead>
            <TableRow>
              <TableHeader width="min">Item Name</TableHeader>
              <TableHeader width="min">SKU</TableHeader>
              <TableHeader width="min">Quantity</TableHeader>
              <TableHeader width="min">Inventory</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell width="min">{item.name}</TableCell>
                <TableCell width="min">{item.sku}</TableCell>
                <TableCell width="min">
                  {item.inventory && item.inventory.quantity !== 'N/A' && 
                   parseInt(item.quantity) > parseInt(item.inventory.quantity) ? (
                    <Text format={{ fontWeight: "bold" }}>{item.quantity}</Text>
                  ) : (
                    item.quantity
                  )}
                </TableCell>
                <TableCell width="min">
                  {item.inventory ? (
                    item.inventory.quantity
                  ) : (
                    <Text format={{ color: "gray" }}>Loading...</Text>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Flex>
  );
};
