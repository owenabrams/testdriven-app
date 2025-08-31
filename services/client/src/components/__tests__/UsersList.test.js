import React from 'react';
import { render } from '@testing-library/react';
import renderer from 'react-test-renderer';

import UsersList from '../UsersList';

const users = [
  {
    'active': true,
    'email': 'hermanmu@gmail.com',
    'id': 1,
    'username': 'michael'
  },
  {
    'active': true,
    'email': 'michael@mherman.org',
    'id': 2,
    'username': 'michaelherman'
  }
];

test('UsersList renders properly', () => {
  const { container } = render(<UsersList users={users}/>);
  const userBoxes = container.querySelectorAll('.box');
  const userTitles = container.querySelectorAll('h4');
  expect(userBoxes.length).toBe(2);
  expect(userTitles.length).toBe(2);
  expect(userTitles[0].textContent).toBe('michael');
  expect(userTitles[1].textContent).toBe('michaelherman');
});

test('UsersList renders a snapshot properly', () => {
  const tree = renderer.create(<UsersList users={users}/>).toJSON();
  expect(tree).toMatchSnapshot();
});
