import React from 'react';

const createComponent = (name: string) => {
  return ({ children, ...props }: any) => React.createElement(name.toLowerCase(), props, children);
};

export const View = createComponent('div');
export const Text = createComponent('span');
export const Image = createComponent('img');
export const Button = createComponent('button');
export const Input = ({ onInput, onConfirm, ...props }: any) =>
  React.createElement('input', { ...props, onChange: onInput });
export const ScrollView = createComponent('div');
export const Textarea = createComponent('textarea');
export const Picker = createComponent('select');
