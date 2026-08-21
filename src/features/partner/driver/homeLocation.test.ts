import { describe, expect, it } from 'vitest';
import { formatPin, homeMapUrl, parseHomePin } from './homeLocation';

describe('parseHomePin', () => {
  it('reads a plain "lat, lng" pair', () => {
    expect(parseHomePin('-6.229728, 106.689399')).toEqual({ lat: -6.229728, lng: 106.689399 });
    expect(parseHomePin('-6.229728;106.689399')).toEqual({ lat: -6.229728, lng: 106.689399 });
  });

  it('rounds to the stored precision', () => {
    expect(parseHomePin('-6.2297281234, 106.6893994321')).toEqual({
      lat: -6.229728,
      lng: 106.689399,
    });
  });

  it('reads the camera segment of a Google Maps place link', () => {
    expect(
      parseHomePin('https://www.google.com/maps/place/Monas/@-6.175392,106.827153,17z/data=!4m2'),
    ).toEqual({ lat: -6.175392, lng: 106.827153 });
  });

  it('prefers the place pin over the camera centre when both are present', () => {
    expect(
      parseHomePin(
        'https://www.google.com/maps/place/Rumah/@-6.175000,106.827000,17z/data=!3m1!4b1!4m5!3m4!1s0x0!8m2!3d-6.176111!4d106.828222',
      ),
    ).toEqual({ lat: -6.176111, lng: 106.828222 });
  });

  it('reads a share/search link query parameter', () => {
    expect(parseHomePin('https://www.google.com/maps/search/?api=1&query=-6.2,106.8')).toEqual({
      lat: -6.2,
      lng: 106.8,
    });
    expect(parseHomePin('https://maps.google.com/?q=-6.2,106.8')).toEqual({
      lat: -6.2,
      lng: 106.8,
    });
  });

  it('rejects anything without usable coordinates', () => {
    expect(parseHomePin('')).toBeNull();
    expect(parseHomePin('Jl. Melati No. 1')).toBeNull();
    expect(parseHomePin('https://maps.app.goo.gl/abc123')).toBeNull(); // short link
    expect(parseHomePin('-6.2')).toBeNull(); // half a pin
  });

  it('rejects out-of-range degrees', () => {
    expect(parseHomePin('-91, 106.8')).toBeNull();
    expect(parseHomePin('-6.2, 181')).toBeNull();
  });

  it('round-trips through formatPin', () => {
    const pin = { lat: -6.229728, lng: 106.689399 };
    expect(parseHomePin(formatPin(pin))).toEqual(pin);
  });
});

describe('homeMapUrl', () => {
  it('drops an exact pin when coordinates exist', () => {
    expect(
      homeMapUrl({ homeLat: -6.229728, homeLng: 106.689399, address: 'Jl. Melati No. 1' }),
    ).toBe('https://www.google.com/maps/search/?api=1&query=-6.229728,106.689399');
  });

  it('falls back to searching the address', () => {
    expect(homeMapUrl({ homeLat: null, homeLng: null, address: 'Jl. Melati No. 1, Bekasi' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Jl.%20Melati%20No.%201%2C%20Bekasi',
    );
  });

  it('has nothing to open without an address or a pin', () => {
    expect(homeMapUrl({ homeLat: null, homeLng: null, address: null })).toBeNull();
    expect(homeMapUrl({ homeLat: null, homeLng: null, address: '   ' })).toBeNull();
  });
});
