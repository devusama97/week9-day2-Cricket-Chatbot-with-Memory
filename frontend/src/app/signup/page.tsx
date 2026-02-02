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

export default function SignupPage() {
    const theme = useTheme();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post(`${config.api.baseUrl}/auth/signup`, {
                username,
                email,
                password,
            });
            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
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
                            Create Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            Join the cricket stats community today
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                                Account created! Redirecting to login...
                            </Alert>
                        )}

                        <form onSubmit={handleSignup}>
                            <TextField
                                fullWidth
                                label="Username"
                                variant="outlined"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                required
                            />
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
                                disabled={loading || success}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    boxShadow: '0 8px 16px rgba(33, 150, 243, 0.2)'
                                }}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Sign Up'}
                            </Button>
                        </form>

                        <Typography variant="body2" sx={{ mt: 4 }}>
                            Already have an account?{' '}
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => router.push('/login')}
                                sx={{ fontWeight: 700, textDecoration: 'none' }}
                            >
                                Login
                            </Link>
                        </Typography>
                    </Paper>
                </Container>
            </Fade>
        </Box>
    );
}
