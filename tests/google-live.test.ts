import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingStreams,realtimeRequests} from '../lib/google-live';
test('realtime queries include only domain-matched streams and do not sum unique users across events',()=>{
 const streams=matchingStreams([{id:'123',url:'http://www.acme.example',measurementId:'G-1'},{id:'456',url:'https://other.example',measurementId:'G-2'},{id:'789',url:'https://acme.example.evil.test',measurementId:'G-3'}],'https://acme.example');
 assert.deepEqual(streams.map(s=>s.id),['123']);
 const [totals,events]=realtimeRequests(streams);
 assert.deepEqual(totals.dimensionFilter.filter.inListFilter.values,['123']);
 assert.equal('dimensions' in totals,false);
 assert.deepEqual(events.dimensions,[{name:'eventName'}]);
 assert.deepEqual(events.metrics,[{name:'eventCount'}]);
 assert.throws(()=>matchingStreams([],'https://acme.example'));
 assert.throws(()=>realtimeRequests([]));
});
