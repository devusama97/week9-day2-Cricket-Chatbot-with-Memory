'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import {
    Box,
    Container,
    TextField,
    IconButton,
    Paper,
    Typography,
    Avatar,
    CircularProgress,
    Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import BoltIcon from '@mui/icons-material/Bolt';
import axios from 'axios';
import FlowVisualizer from './FlowVisualizer';
import DataTable from './DataTable';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    steps?: string[];
    results?: any[];
}

// Memoized Input Component to fix typing lag
const ChatInput = React.memo(({ onSend, disabled }: { onSend: (val: string) => void, disabled: boolean }) => {
    const [val, setVal] = useState('');

    const handleSend = () => {
        if (!val.trim()) return;
        onSend(val);
        setVal('');
    };

    return (
        <Paper sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 4 }}>
            <Box sx={{ ml: 2, flex: 1 }}>
                <TextField
                    fullWidth
                    placeholder="Ask about cricket stats..."
                    variant="standard"
                    sx={{ flex: 1 }}
                    InputProps={{ disableUnderline: true }}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={disabled}
                />
            </Box>
            <IconButton color="primary" sx={{ p: '10px' }} onClick={handleSend} disabled={disabled}>
                <SendIcon />
            </IconButton>
        </Paper>
    );
});

ChatInput.displayName = 'ChatInput';

const ChatInterface = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentSteps, setCurrentSteps] = useState<string[]>([]);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentSteps]);

    const handleSend = async (question: string) => {
        const userMsg: Message = { role: 'user', content: question };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setCurrentSteps([]);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Use fetch for streaming
            const response = await fetch(`${apiUrl}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedData = '';
            let lastState: any = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                accumulatedData += decoder.decode(value, { stream: true });
                const lines = accumulatedData.split('\n');

                // Keep the last partial line in accumulatedData
                accumulatedData = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line);
                        lastState = chunk;
                        if (chunk.executionSteps) {
                            // This will update the UI in real-time
                            setCurrentSteps(chunk.executionSteps);
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }

            if (lastState) {
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: lastState.answer || "I've processed your request.",
                    steps: lastState.executionSteps,
                    results: lastState.queryResults
                };
                setMessages(prev => [...prev, assistantMsg]);
            }
        } catch (error) {
            console.error('Error asking agent:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Check if the backend is running and the API key is valid.'
            }]);
        } finally {
            setIsProcessing(false);
            setCurrentSteps([]);
        }
    };

    const handleSeed = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            await axios.post(`${apiUrl}/seed/run`);
            alert('Data seeded successfully!');
        } catch (err) {
            alert('Seeding failed. Check if backend is running.');
        }
    };

    return (
        <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BoltIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight={700}>Cricket Stats Agent</Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={handleSeed}>Seed Data</Button>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 3, pr: 1 }}>
                {messages.map((msg, i) => (
                    <Box key={i} sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 2, maxWidth: '80%' }}>
                            {msg.role === 'assistant' && <Avatar sx={{ bgcolor: 'secondary.main' }}>AI</Avatar>}
                            <Paper sx={{
                                p: 2,
                                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '0 12px 12px 12px'
                            }}>
                                <Typography variant="body1">{msg.content}</Typography>
                            </Paper>
                        </Box>
                        {msg.results && msg.results.length > 1 && <DataTable data={msg.results} />}
                    </Box>
                ))}
                {isProcessing && (
                    <Box sx={{ mt: 2 }}>
                        <FlowVisualizer currentSteps={currentSteps} isProcessing={isProcessing} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption">Agent is thinking...</Typography>
                        </Box>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            <ChatInput onSend={handleSend} disabled={isProcessing} />
        </Container>
    );
};

export default ChatInterface;
