'use client';

import React from 'react';
import { Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

const DataTable = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;
    const columns: GridColDef[] = Object.keys(data[0])
        .filter(key => key !== '_id' && key !== '__v')
        .map(key => ({
            field: key,
            headerName: key.charAt(0).toUpperCase() + key.slice(1),
            flex: 1,
            minWidth: 120,
        }));

    return (
        <Box sx={{ height: 350, width: '100%', mt: 2 }}>
            <DataGrid
                rows={data.map((row, i) => ({ id: i, ...row }))}
                columns={columns}
                pageSizeOptions={[5]}
                disableRowSelectionOnClick
                sx={{ border: 'none', bgcolor: 'background.paper', borderRadius: 2 }}
            />
        </Box>
    );
};

export default DataTable;
