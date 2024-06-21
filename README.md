## Alberti Protocol Pool

Alberti Protcol Pool is a graphQL endpoint.

### Running

Simple Way - (requires NodeJs Installed)

```
npx @albertiprotocol/pool
```

Complex Way - A bash script to restart pool if it crashes 

```sh
#!/bin/bash

while :
do
    npx @albertiprotocol/pool
    echo "Process exited. Restarting..."
    sleep 1  # Adjust the sleep time as needed
done
```

## Usage

Once the server is running, you can access the API at `http://localhost:<port>`.
