# Hyerdrive integration with websocket

## Session Discovery for Hyperdrive
~~~
cd C:\Program Files (x86)\Epic\Hyperdrive\VersionIndependent

Launcher.exe id=100 env=openEpicProduction


curl {hub.url}/subspace-configuration

~~~

## Key pair for Hyperdrive
~~~
#create keys
openssl genpkey -algorithm RSA -out private.key -pkeyopt rsa_keygen_bits:2048

#export public key to be imported in fhir.epic.com for the app
openssl req -new -x509 -key ./private.key -out ./publickey509.pem -subj
 '/CN=HereEpicApp'

~~~


## Session Discover
To retrieve hub.url and hub.topic
~~~
Launcher.exe id=100 env=openEpicProduction

curl hub.url/subspace-configuration
~~~

## Retrieve Access Token

copy gwt string from "npm run start"

~~~
const url = `${hub.url}/token`;
const params = new URLSearchParams();
params.append('grant_type', 'client_credentials');
params.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
params.append('client_assertion', jwtString);

res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString()
})

~~~