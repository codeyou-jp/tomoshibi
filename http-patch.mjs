// Sanitize non-ASCII characters from HTTP headers before Vercel CLI sends them
import http from 'node:http';
import https from 'node:https';

const origSet = http.ClientRequest.prototype.setHeader;
http.ClientRequest.prototype.setHeader = function(name, value) {
  if (typeof value === 'string') {
    value = value.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim();
  }
  return origSet.call(this, name, value);
};
