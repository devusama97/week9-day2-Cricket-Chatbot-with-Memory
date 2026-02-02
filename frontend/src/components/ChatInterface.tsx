'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Box,
    Container,
    TextField,
    IconButton,
    Paper,
    Typography,
    Avatar,
    CircularProgress,
    Button,
    List,
    ListItem,
    ListItemText,
    Divider,
    Drawer,
    ListSubheader,
    ListItemIcon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Menu,
    MenuItem,
    Tooltip
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import MemoryIcon from '@mui/icons-material/Memory';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import BoltIcon from '@mui/icons-material/Bolt';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import FlowVisualizer from './FlowVisualizer';
import DataTable from './DataTable';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';

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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { isAuthenticated, user, logout, token } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentSteps, setCurrentSteps] = useState<string[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const router = useRouter();
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentSteps]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSessions();
        }
    }, [isAuthenticated]);

    const fetchSessions = async () => {
        try {
            const apiUrl = config.api.baseUrl;
            const res = await axios.get(`${apiUrl}/agent/sessions`);
            setSessions(res.data);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        }
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const startNewChat = () => {
        setSessionId(`session-${Date.now()}`);
        setMessages([]);
        setCurrentSteps([]);
        if (isMobile) setMobileOpen(false);
    };

    const switchSession = async (sid: string) => {
        setSessionId(sid);
        setCurrentSteps([]);
        if (isMobile) setMobileOpen(false);
        try {
            const apiUrl = config.api.baseUrl;
            const res = await axios.get(`${apiUrl}/agent/messages/${sid}`);
            // Map history to messages
            const historyMsgs: Message[] = res.data.flatMap((h: any) => [
                { role: 'user', content: h.question },
                { role: 'assistant', content: h.answer, results: h.results }
            ]);
            setMessages(historyMsgs);
        } catch (err) {
            console.error('Failed to load session:', err);
        }
    };

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;

        try {
            const apiUrl = config.api.baseUrl;
            await axios.post(`${apiUrl}/agent/sessions/delete/${sessionToDelete}`);

            if (sessionId === sessionToDelete) {
                startNewChat();
            }

            fetchSessions();
            setIsDeleteDialogOpen(false);
            setSessionToDelete(null);
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const handleSend = async (question: string) => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const userMsg: Message = { role: 'user', content: question };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setCurrentSteps([]);

        try {
            const apiUrl = config.api.baseUrl;

            // Use fetch for streaming
            const response = await fetch(`${apiUrl}/agent/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question, sessionId }),
            });

            if (response.status === 401) {
                logout();
                router.push('/login');
                return;
            }

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedData = '';
            let lastState: any = {};

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
                        lastState = { ...lastState, ...chunk };
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
            fetchSessions(); // Refresh session list
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
        router.push('/login');
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
        <Box sx={{ display: 'flex' }}>
            {/* Session Drawer */}
            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better mobile performance
                }}
                sx={{
                    width: 280,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                        bgcolor: 'background.paper',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                }}
            >
                <Box sx={{ p: 2, mt: 8 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={startNewChat}
                        sx={{
                            mb: 4,
                            borderRadius: 3,
                            py: 1.5,
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: 'text.primary',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                    >
                        New Chat
                    </Button>

                    <Typography variant="caption" color="text.secondary" sx={{ px: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Recent Chats
                    </Typography>

                    <List sx={{ mt: 1 }}>
                        {sessions.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ px: 2, mt: 2 }}>No recent chats.</Typography>
                        ) : (
                            sessions.map((s, i) => (
                                <ListItem
                                    key={s._id}
                                    disablePadding
                                    sx={{
                                        mb: 0.5,
                                        borderRadius: 2,
                                        bgcolor: sessionId === s._id ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    <Button
                                        fullWidth
                                        onClick={() => switchSession(s._id)}
                                        sx={{
                                            justifyContent: 'flex-start',
                                            color: sessionId === s._id ? 'white' : 'text.secondary',
                                            textTransform: 'none',
                                            px: 2,
                                            py: 1
                                        }}
                                        startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
                                    >
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                                            {s.title}
                                        </Typography>
                                    </Button>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSessionToDelete(s._id);
                                            setIsDeleteDialogOpen(true);
                                        }}
                                        sx={{
                                            mr: 1,
                                            color: 'text.secondary',
                                            '&:hover': { color: 'error.main' }
                                        }}
                                    >
                                        <DeleteIcon fontSize="inherit" />
                                    </IconButton>
                                </ListItem>
                            ))
                        )}
                    </List>
                </Box>
            </Drawer>

            <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: { xs: 2, md: 4 }, flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isMobile && (
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 1 }}
                            >
                                <MenuIcon />
                            </IconButton>
                        )}
                        <BoltIcon color="primary" sx={{ fontSize: { xs: 24, md: 32 } }} />
                        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1rem', md: '1.5rem' } }}>Cricket Stats Agent</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button variant="outlined" size="small" onClick={handleSeed} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Seed Data</Button>
                        {isAuthenticated ? (
                            <>
                                <Tooltip title="Account settings">
                                    <IconButton
                                        onClick={handleMenuOpen}
                                        size="small"
                                        sx={{ ml: 2 }}
                                        aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                    >
                                        <Avatar sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: 'primary.main',
                                            boxShadow: '0 0 10px rgba(33, 150, 243, 0.3)'
                                        }}>
                                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </Avatar>
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    anchorEl={anchorEl}
                                    id="account-menu"
                                    open={Boolean(anchorEl)}
                                    onClose={handleMenuClose}
                                    onClick={handleMenuClose}
                                    PaperProps={{
                                        elevation: 0,
                                        sx: {
                                            overflow: 'visible',
                                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                            mt: 1.5,
                                            bgcolor: 'background.paper',
                                            borderRadius: 3,
                                            '& .MuiAvatar-root': {
                                                width: 32,
                                                height: 32,
                                                ml: -0.5,
                                                mr: 1,
                                            },
                                        },
                                    }}
                                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                >
                                    <Box sx={{ px: 2, py: 1.5 }}>
                                        <Typography variant="subtitle2" fontWeight={700}>{user?.username}</Typography>
                                        <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                                    </Box>
                                    <Divider />
                                    <MenuItem onClick={handleMenuClose}>
                                        <ListItemIcon>
                                            <PersonIcon fontSize="small" />
                                        </ListItemIcon>
                                        Profile
                                    </MenuItem>
                                    <MenuItem onClick={handleLogout}>
                                        <ListItemIcon>
                                            <LogoutIcon fontSize="small" />
                                        </ListItemIcon>
                                        Logout
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => router.push('/login')}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                Login
                            </Button>
                        )}
                    </Box>
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

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                PaperProps={{
                    sx: { bgcolor: 'background.paper', borderRadius: 4, minWidth: 320 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Chat?</DialogTitle>
                <DialogContent>
                    <DialogContentText color="text.secondary">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setIsDeleteDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleDeleteSession} variant="contained" color="error" sx={{ borderRadius: 2 }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ChatInterface;
