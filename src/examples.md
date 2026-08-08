# ONE PERCENT x402 buyer examples

Default endpoint: `{{DEFAULT_ACCESS_URL}}`

The buyer wallet must already be authorized by its operator and funded with Base Sepolia USDC.

## TypeScript fetch

```bash
npm install @x402/fetch @x402/core @x402/evm viem
```

```ts
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const response = await fetchWithPayment("{{DEFAULT_ACCESS_URL}}");
const dossier = await response.json();
const settlement = new x402HTTPClient(client).getPaymentSettleResponse(
  (name) => response.headers.get(name),
);
console.log({ dossier, settlement });
```

## Axios

```bash
npm install @x402/axios @x402/evm viem axios
```

```ts
import axios from "axios";
import { x402Client, wrapAxiosWithPayment, x402HTTPClient } from "@x402/axios";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));

const api = wrapAxiosWithPayment(axios.create(), client);
const response = await api.get("{{DEFAULT_ACCESS_URL}}");
const settlement = new x402HTTPClient(client).getPaymentSettleResponse(
  (name) => response.headers[name.toLowerCase()],
);
console.log({ dossier: response.data, settlement });
```

## Python httpx

```bash
pip install "x402[httpx]" eth-account
```

```python
import asyncio
import os
from eth_account import Account
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

async def main():
    client = x402Client()
    account = Account.from_key(os.environ["EVM_PRIVATE_KEY"])
    register_exact_evm_client(client, EthAccountSigner(account))
    async with x402HttpxClient(client) as http:
        response = await http.get("{{DEFAULT_ACCESS_URL}}")
        await response.aread()
        settlement = x402HTTPClient(client).get_payment_settle_response(
            lambda name: response.headers.get(name)
        )
        print({"dossier": response.json(), "settlement": settlement})

asyncio.run(main())
```

## Raw PAYMENT-REQUIRED to PAYMENT-SIGNATURE flow

```bash
# 1. Request the resource and retain PAYMENT-REQUIRED.
curl -i "{{DEFAULT_ACCESS_URL}}"

# 2. Decode PAYMENT-REQUIRED, select the exact eip155:84532 requirement,
#    and sign its EIP-712 authorization with an operator-authorized wallet.

# 3. Base64-encode the x402 v2 PaymentPayload and retry.
curl -i "{{DEFAULT_ACCESS_URL}}" \
  -H "PAYMENT-SIGNATURE: <base64-payment-payload>"

# 4. Read the dossier JSON and PAYMENT-RESPONSE settlement header.
```
