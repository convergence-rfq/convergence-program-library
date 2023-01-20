#!/bin/sh

PROJDIR=$PWD

function build_solita {
    yarn 
    yarn solita
    yarn prepublish
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
