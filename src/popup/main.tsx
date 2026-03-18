import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import { Popup } from './Popup';

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
