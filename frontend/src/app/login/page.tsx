'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Container,
    Alert,
    CircularProgress,
    Link,
    Fade
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { config } from '@/config';
import { useAuth } from '@/context/AuthContext';
import BoltIcon from '@mui/icons-material/Bolt';

export default function LoginPage() {
    const theme = useTheme();
    const router = useRouter();
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await axios.post(`${config.api.baseUrl}/auth/login`, {
                email,
                password,
            });
            login(response.data.access_token, response.data.user);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at top right, rgba(33, 150, 243, 0.1), transparent), radial-gradient(circle at bottom left, rgba(156, 39, 176, 0.1), transparent)',
                bgcolor: 'background.default',
                p: 2
            }}
        >
            <Fade in={true} timeout={800}>
                <Container maxWidth="xs">
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            borderRadius: 6,
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            textAlign: 'center'
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Box
                                sx={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(33, 150, 243, 0.4)'
                                }}
                            >
                                <BoltIcon sx={{ fontSize: 35, color: 'white' }} />
                            </Box>
                        </Box>

                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            Welcome Back
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            Login to continue your cricket stats journey
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleLogin}>
                            <TextField
                                fullWidth
                                label="Email"
                                variant="outlined"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                variant="outlined"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                required
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                type="submit"
                                disabled={loading}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    boxShadow: '0 8px 16px rgba(33, 150, 243, 0.2)'
                                }}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Login'}
                            </Button>
                        </form>

                        <Typography variant="body2" sx={{ mt: 4 }}>
                            Don't have an account?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => router.push('/signup')}
                                sx={{ fontWeight: 700, textDecoration: 'none' }}
                            >
                                Sign Up
                            </Link>
                        </Typography>
                    </Paper>
                </Container>
            </Fade>
        </Box>
    );
}
