#!/bin/bash

SCRIPT_PATH=$(readlink -f "$0")
CPL_PATH=$(dirname $(dirname $SCRIPT_PATH))

rsync -r $CPL_PATH --exclude='.anchor' --exclude='.git' --exclude='node_modules' \
    -e "ssh -i ~/.ssh/id_ed25519_pindaroso" \
    --exclude='target' \
    root@152.42.173.249:/root

#scp -r -i ~/.ssh/id_ed25519_pindaroso root@146.190.86.237:/root/convergence-program-library-v3/target/idl idl
