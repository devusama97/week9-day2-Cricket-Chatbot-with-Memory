'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    Box,
    Tabs,
    Tab,
    Alert,
    Typography
} from '@mui/material';
import axios from 'axios';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
    const [tab, setTab] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await axios.post(`${config.api.baseUrl}/auth/login`, {
                email,
                password,
            });
            login(response.data.access_token, response.data.user);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await axios.post(`${config.api.baseUrl}/auth/signup`, {
                email,
                username,
                password,
            });
            login(response.data.access_token, response.data.user);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
                Welcome to Cricket Stats Agent
            </DialogTitle>
            <DialogContent>
                <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} centered sx={{ mb: 3 }}>
                    <Tab label="Login" />
                    <Tab label="Sign Up" />
                </Tabs>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {tab === 0 ? (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleLogin}
                            disabled={loading}
                            sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </Box>
                ) : (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSignup(); }}>
                        <TextField
                            fullWidth
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSignup}
                            disabled={loading}
                            sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                        >
                            {loading ? 'Creating account...' : 'Sign Up'}
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
