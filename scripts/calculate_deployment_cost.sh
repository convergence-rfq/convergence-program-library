#!/bin/bash

calculate_cost() {
  local program_name=$1
  local sol_usd=$2

  local bytes=$(du -k -s target/deploy/$program_name.so | awk '{print $1*1024}')
  local sol=$(solana rent $bytes | awk '{print $3}' | awk 'NR==3')
  local result=$(echo "$sol * $sol_usd" | bc)

  echo "$result"
}

PROGRAMS=(
  "rfq"
  "spot_instrument"
  "risk_engine"
  "psyoptions_european_instrument"
  "psyoptions_american_instrument"
)

SOL_USD=23.96
TOTAL=0

for program in "${PROGRAMS[@]}"; do
  COST=$(calculate_cost "$program" $SOL_USD)
  TOTAL=$(echo "$COST + $TOTAL" | bc)
done

echo "Cost: $TOTAL"