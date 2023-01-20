#!/bin/sh

set -x

PROJDIR=$PWD

function build_solita {
    yarn 
    yarn solita
    yarn prepublish
}

cd $PROJDIR/rfq/js
build_solita

cd $PROJDIR/spot-instrument/js
build_solita

cd $PROJDIR/psyoptions-european-instrument/js
build_solita

cd $PROJDIR/psyoptions-american-instrument/js
build_solita