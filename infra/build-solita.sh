#!/bin/sh

PROJDIR=$PWD

build_solita () {
    yarn 
    yarn solita
    yarn build
    npm publish
}

cd $PROJDIR/rfq/js
build_solita

cd $PROJDIR/risk-engine/js
build_solita

cd $PROJDIR/spot-instrument/js
build_solita

cd $PROJDIR/psyoptions-european-instrument/js
build_solita

cd $PROJDIR/psyoptions-american-instrument/js
build_solita

cd $PROJDIR/hxro-print-trade-provider/js
build_solita

cd $PROJDIR/vault-operator/js
build_solita