import React from 'react';
import { createRoot } from 'react-dom/client';
import './sidepanel.css';
import { SidePanel } from './SidePanel';

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
