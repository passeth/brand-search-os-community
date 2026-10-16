import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appOrigin} from '../lib/app-origin';
test('each installation uses its own fixed origin',()=>{
 assert.equal(appOrigin('https://analytics.example.com/'),'https://analytics.example.com');
 assert.equal(appOrigin('http://localhost:3000'),'http://localhost:3000');
});
test('OAuth origin rejects credentials, non-HTTPS remote origins and path injection',()=>{
 for(const value of ['', 'https://user:pass@example.com','http://example.com','https://example.com/path','https://example.com?next=evil','https://example.com/#fragment']) assert.throws(()=>appOrigin(value));
});
