'use client';

import React from 'react';
import { Box, Paper, Typography, Stepper, Step, StepLabel, styled, StepConnector, stepConnectorClasses } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';

const nodes = ['Relevancy Checker', 'Query Generator', 'Query Executor', 'Answer Formatter', 'Final Response'];

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
    [`&.${stepConnectorClasses.active}`]: { [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(34, 197, 94) 0%,rgb(59, 130, 246) 100%)' } },
    [`&.${stepConnectorClasses.completed}`]: { [`& .${stepConnectorClasses.line}`]: { backgroundImage: 'linear-gradient( 95deg,rgb(34, 197, 94) 0%,rgb(34, 197, 94) 100%)' } },
    [`& .${stepConnectorClasses.line}`]: { height: 3, border: 0, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0', borderRadius: 1 },
}));

const ColorlibStepIconRoot = styled('div')<{ ownerState: { completed?: boolean; active?: boolean } }>(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
    zIndex: 1, color: '#fff', width: 50, height: 50, display: 'flex', borderRadius: '50%', justifyContent: 'center', alignItems: 'center',
    ...(ownerState.active && { backgroundImage: 'linear-gradient( 136deg, rgb(34, 197, 94) 0%, rgb(59, 130, 246) 100%)', boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)' }),
    ...(ownerState.completed && { backgroundImage: 'linear-gradient( 136deg, rgb(34, 197, 94) 0%, rgb(16, 185, 129) 100%)' }),
}));

function ColorlibStepIcon(props: { active?: boolean; completed?: boolean; icon: React.ReactNode }) {
    const { active, completed } = props;
    return (
        <ColorlibStepIconRoot ownerState={{ completed, active }}>
            {completed ? <CheckCircleIcon /> : active ? <PendingIcon /> : <RadioButtonUncheckedIcon />}
        </ColorlibStepIconRoot>
    );
}

const FlowVisualizer = ({ currentSteps, isProcessing }: { currentSteps: string[], isProcessing: boolean }) => {
    // Determine the active step by checking which node labels are present in the current execution steps
    const activeStep = nodes.reduce((acc, node, idx) => {
        // If the node name (e.g. "Relevancy Checker") is found in currentSteps, update active index
        const isTriggered = currentSteps.some(step => step.toLowerCase().includes(node.split(' ')[0].toLowerCase()));
        return isTriggered ? idx : acc;
    }, -1);
    return (
        <Paper sx={{ p: 3, bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)' }}>
            <Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
                {nodes.map((label) => (
                    <Step key={label}>
                        <StepLabel StepIconComponent={ColorlibStepIcon}>
                            <Typography variant="caption">{label}</Typography>
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>
        </Paper>
    );
};

export default FlowVisualizer;
