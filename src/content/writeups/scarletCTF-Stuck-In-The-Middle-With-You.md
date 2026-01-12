---
title: "OSINT Write-Up - Stuck In The Middle With You"
description: 'The goal of this challenge was to identify a Tor relay based on a provided fingerprint and determine all IPv4 addresses belonging to its effective family.'
pubDate: 'Ene 12 2025'
heroImage: ''
ctf: 'ScarletCTF
---

## Challenge Overview

The goal of this challenge was to identify a Tor relay based on a provided fingerprint and determine all IPv4 addresses belonging to its **effective family**. The final flag required listing the IPv4 addresses of the relay and its family members, ordered from the **oldest relay to the youngest**, based on the time they were first observed on the Tor network.

---

## Initial Enumeration

The challenge provided the following Tor relay fingerprint:

A68097FE97D3065B1A6F4CE7187D753F8B8513F5

Using a Tor metrics explorer, this fingerprint was searched to identify the corresponding relay. The relay was successfully located, revealing detailed information such as its nickname, operator contact, autonomous system, IP addresses, and fa
mily relationships.

---

## Identifying the Relay Family

On the relay’s metrics page, the **Effective Family Members** section listed three fingerprints:

414E64BA607560F9D9C196A825950DC968700420
A68097FE97D3065B1A6F4CE7187D753F8B8513F5
B4CAFD9CBFB34EC5DAAC146920DC7DFAFE91EA20


This confirmed that the relay belonged to a family of three nodes, all operated by the same entity. Only these effective family members were relevant to the challenge.

---

## Extracting IPv4 Addresses and First Seen Dates

Each fingerprint was opened individually in the metrics explorer to collect the required data.

| Location        | IPv4 Address       | First Seen        |
|-----------------|--------------------|-------------------|
| France          | 212.47.233.86      | 6y 10mo 4w ago    |
| Netherlands     | 51.15.40.38        | 5y 9mo 1w ago     |
| Poland          | 151.115.73.55      | 1y 1w 5d ago      |

Only IPv4 addresses were considered, as required by the challenge.

---

## Ordering the Relays

The IPv4 addresses were ordered according to the **First Seen** field, from the oldest relay to the most recently observed:

1. France – 212.47.233.86  
2. Netherlands – 51.15.40.38  
3. Poland – 151.115.73.55  

---

## Final Flag

RUSEC{212.47.233.86:51.15.40.38:151.115.73.55}