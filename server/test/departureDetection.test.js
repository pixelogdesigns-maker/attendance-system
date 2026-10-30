import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextDepartureState } from '../src/services/departureDetectionService.js';

const office = { outsideReadingsRequired: 3, insideReadingsRequired: 2 };
const initial = { locationState: 'inside', consecutiveOutside: 0, consecutiveInside: 0 };

function run(classifications) {
  let state = initial;
  const events = [];
  for (const c of classifications) {
    const result = nextDepartureState(state, c, office);
    state = result.state;
    if (result.event) events.push(result.event);
  }
  return { state, events };
}

test('one outside reading does not raise a departure', () => {
  assert.deepEqual(run(['outside']).events, []);
});

test('three outside readings in a row raise exactly one departure', () => {
  const { state, events } = run(['outside', 'outside', 'outside', 'outside', 'outside']);
  assert.deepEqual(events, ['departure']);
  assert.equal(state.locationState, 'outside');
});

test('an inside reading resets the outside count', () => {
  assert.deepEqual(run(['outside', 'outside', 'inside', 'outside', 'outside']).events, []);
});

test('uncertain and buffer readings neither count nor reset', () => {
  assert.deepEqual(run(['outside', 'uncertain', 'buffer', 'outside', 'outside']).events, ['departure']);
});

test('two inside readings after a departure raise a return', () => {
  const { state, events } = run(['outside', 'outside', 'outside', 'inside', 'inside', 'inside']);
  assert.deepEqual(events, ['departure', 'return']);
  assert.equal(state.locationState, 'inside');
});

test('a second trip out raises a second departure', () => {
  const { events } = run([
    'outside', 'outside', 'outside', 'inside', 'inside', 'outside', 'outside', 'outside',
  ]);
  assert.deepEqual(events, ['departure', 'return', 'departure']);
});

test('inside readings without a departure raise nothing', () => {
  assert.deepEqual(run(['inside', 'inside', 'inside']).events, []);
});
