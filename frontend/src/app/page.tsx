import ChatInterface from "@/components/ChatInterface";
import { Box } from "@mui/material";

export default function Home() {
    return (
        <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <ChatInterface />
        </Box>
    );
}
