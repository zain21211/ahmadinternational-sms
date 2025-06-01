import React, { useCallback } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
// Import useNavigate from react-router-dom
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material'; // For consistent styling


// Add isLedgerTable prop (defaults to false)
const DataTable = ({ data = [], columns = [], rowKey, onDelete, apiEndpoint, isLedgerTable = false }) => {
  const navigate = useNavigate(); // Initialize the navigate function

  const deleteColumn = columns.find(col => col.id === 'delete');
  const enableDelete = !!(deleteColumn && onDelete && apiEndpoint && rowKey);

  const visibleColumns = columns;

  function formatDate(value) {
    const date = new Date(value); // convert input to Date
  const day = String(date.getDate()).padStart(2, "0");      // get day and pad with 0 if needed
  const month = String(date.getMonth() + 1).padStart(2, "0"); // get month (0-based) +1 and pad
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}


  const handleDelete = useCallback(async (id) => {
    // ... (handleDelete logic remains the same) ...
    if (!enableDelete || !id) {
      console.warn("Delete cancelled: Delete functionality not fully configured or ID missing.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const deleteUrl = `http://localhost:3001/${apiEndpoint}/${id}`;
        console.log(`Attempting DELETE: ${deleteUrl}`);
        await axios.delete(deleteUrl);
        onDelete(id);
        console.log("Delete successful for ID:", id);
      } catch (error) {
        console.error('Error deleting item:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete item. Please check server logs.';
        alert(`Delete failed: ${errorMsg}`);
      }
    }
  }, [enableDelete, onDelete, apiEndpoint]); // Removed rowKey from here as it's not directly used by handleDelete

  const tableData = Array.isArray(data) ? data : [];

  const handleDocumentClick = (docNo) => {
    if (docNo) {
      // Adjust your route structure as needed
      const url = `/invoice/${docNo}`;
      navigate(url);
    }
  };

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table
          stickyHeader
          aria-label="sticky table"
          sx={{
             fontFamily: '"Times New Roman", Times, serif',
             minWidth: columns.reduce((sum, col) => sum + (col.minWidth || (col.id === 'narration' ? 200 : 100)), 0)
           }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                 (column.id !== 'delete' || enableDelete) && (
                    <TableCell
                    key={column.id}
                    align={column.align || 'center'}
                    style={{
                      minWidth: column.minWidth || (column.id === 'narration' ? 200 : 100),
                      width: column.width,
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      border: '1px solid #ddd',
                      padding: '8px 10px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {column.label}
                  </TableCell>
                 )
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 5 }}>
                       No data available.
                    </TableCell>
                 </TableRow>
            ) : (
                tableData.map((row, index) => {
                    const rowId = rowKey ? row[rowKey] : null;
                    return (
                        <TableRow hover role="checkbox" tabIndex={-1} key={rowId || index}>
                            {visibleColumns.map((column) => {
                            if (column.id === 'delete' && !enableDelete) return null;

                            const value = row[column.id]; // Use column.id to get value

                            return (
                                <TableCell
                                key={column.id}
                                align={column.align || 'center'}
                                style={{
                                    border: '1px solid #ddd',
                                    padding: '6px 8px',
                                    textTransform: 'none',
                                    minWidth: column.minWidth || (column.id === 'narration' ? 200 : 100),
                                    boxSizing: 'border-box'
                                }}
                                >
                                {
                                  // Custom rendering for the document number in ledger
                                  isLedgerTable && column.id === 'Doc' && row.Type.toLowerCase() === 'sale' && value ? (
                                    <Typography
                                        onClick={() => handleDocumentClick(value)} // Call handler on click
                                        sx={{
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            '&:hover': {
                                                textDecoration: 'underline',
                                            },
                                            cursor: 'pointer' // Make it look clickable
                                        }}
                                    >
                                        {value}
                                    </Typography>
                                  ) : isLedgerTable && column.id.toLowerCase() === "date"? (
                                    formatDate(value)
                                ) : column.id === 'delete' && enableDelete ? (
                                    <IconButton
                                        onClick={() => handleDelete(rowId)}
                                        disabled={!rowId}
                                        size="small"
                                    >
                                    <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  ) : column.render ? (
                                    column.render(value, row)
                                  ) : (
                                    value
                                  )}
                                </TableCell>
                            );
                            })}
                        </TableRow>
                    );
                })
             )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DataTable;