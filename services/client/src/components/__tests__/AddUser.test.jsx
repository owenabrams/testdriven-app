import React from 'react';
import { render } from '@testing-library/react';
import renderer from 'react-test-renderer';

import AddUser from '../AddUser';

test('AddUser renders properly', () => {
  const { container } = render(<AddUser/>);
  const element = container.querySelector('form');
  const inputs = element.querySelectorAll('input');
  expect(inputs.length).toBe(3);
  expect(inputs[0].name).toBe('username');
  expect(inputs[1].name).toBe('email');
  expect(inputs[2].type).toBe('submit');
});

test('AddUser renders a snapshot properly', () => {
  const tree = renderer.create(<AddUser/>).toJSON();
  expect(tree).toMatchSnapshot();
});
