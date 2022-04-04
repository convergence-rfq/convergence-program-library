(function() {var implementors = {};
implementors["rfq"] = [{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.Initialize.html\" title=\"struct rfq::instruction::Initialize\">Initialize</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::instruction::Initialize"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.Request.html\" title=\"struct rfq::instruction::Request\">Request</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.i64.html\">i64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"struct\" href=\"https://doc.rust-lang.org/1.59.0/alloc/vec/struct.Vec.html\" title=\"struct alloc::vec::Vec\">Vec</a>&lt;<a class=\"struct\" href=\"rfq/struct.Leg.html\" title=\"struct rfq::Leg\">Leg</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Order.html\" title=\"enum rfq::Order\">Order</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::instruction::Request"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.Respond.html\" title=\"struct rfq::instruction::Respond\">Respond</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::instruction::Respond"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.Confirm.html\" title=\"struct rfq::instruction::Confirm\">Confirm</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Order.html\" title=\"enum rfq::Order\">Order</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::instruction::Confirm"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.LastLook.html\" title=\"struct rfq::instruction::LastLook\">LastLook</a>","synthetic":false,"types":["rfq::instruction::LastLook"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.ReturnCollateral.html\" title=\"struct rfq::instruction::ReturnCollateral\">ReturnCollateral</a>","synthetic":false,"types":["rfq::instruction::ReturnCollateral"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/instruction/struct.Settle.html\" title=\"struct rfq::instruction::Settle\">Settle</a>","synthetic":false,"types":["rfq::instruction::Settle"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/struct.RfqState.html\" title=\"struct rfq::RfqState\">RfqState</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.bool.html\">bool</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u8.html\">u8</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;Pubkey&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;Pubkey&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u8.html\">u8</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Order.html\" title=\"enum rfq::Order\">Order</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.bool.html\">bool</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.bool.html\">bool</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.i64.html\">i64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"struct\" href=\"https://doc.rust-lang.org/1.59.0/alloc/vec/struct.Vec.html\" title=\"struct alloc::vec::Vec\">Vec</a>&lt;<a class=\"struct\" href=\"rfq/struct.Leg.html\" title=\"struct rfq::Leg\">Leg</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u8.html\">u8</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Order.html\" title=\"enum rfq::Order\">Order</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.i64.html\">i64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.i64.html\">i64</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::RfqState"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/struct.ProtocolState.html\" title=\"struct rfq::ProtocolState\">ProtocolState</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u8.html\">u8</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::ProtocolState"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/struct.OrderState.html\" title=\"struct rfq::OrderState\">OrderState</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"https://doc.rust-lang.org/1.59.0/core/option/enum.Option.html\" title=\"enum core::option::Option\">Option</a>&lt;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>&gt;: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u8.html\">u8</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.bool.html\">bool</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::OrderState"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.Initialize.html\" title=\"struct rfq::accounts::Initialize\">Initialize</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_initialize::Initialize"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.Request.html\" title=\"struct rfq::accounts::Request\">Request</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_request::Request"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.Respond.html\" title=\"struct rfq::accounts::Respond\">Respond</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_respond::Respond"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.Confirm.html\" title=\"struct rfq::accounts::Confirm\">Confirm</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_confirm::Confirm"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.LastLook.html\" title=\"struct rfq::accounts::LastLook\">LastLook</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_last_look::LastLook"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.ReturnCollateral.html\" title=\"struct rfq::accounts::ReturnCollateral\">ReturnCollateral</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_return_collateral::ReturnCollateral"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/accounts/struct.Settle.html\" title=\"struct rfq::accounts::Settle\">Settle</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;Pubkey: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::__client_accounts_settle::Settle"]},{"text":"impl BorshSerialize for <a class=\"enum\" href=\"rfq/enum.Instrument.html\" title=\"enum rfq::Instrument\">Instrument</a>","synthetic":false,"types":["rfq::Instrument"]},{"text":"impl BorshSerialize for <a class=\"enum\" href=\"rfq/enum.Side.html\" title=\"enum rfq::Side\">Side</a>","synthetic":false,"types":["rfq::Side"]},{"text":"impl BorshSerialize for <a class=\"enum\" href=\"rfq/enum.Venue.html\" title=\"enum rfq::Venue\">Venue</a>","synthetic":false,"types":["rfq::Venue"]},{"text":"impl BorshSerialize for <a class=\"struct\" href=\"rfq/struct.Leg.html\" title=\"struct rfq::Leg\">Leg</a> <span class=\"where fmt-newline\">where<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Instrument.html\" title=\"enum rfq::Instrument\">Instrument</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Venue.html\" title=\"enum rfq::Venue\">Venue</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"enum\" href=\"rfq/enum.Side.html\" title=\"enum rfq::Side\">Side</a>: BorshSerialize,<br>&nbsp;&nbsp;&nbsp;&nbsp;<a class=\"primitive\" href=\"https://doc.rust-lang.org/1.59.0/std/primitive.u64.html\">u64</a>: BorshSerialize,&nbsp;</span>","synthetic":false,"types":["rfq::Leg"]},{"text":"impl BorshSerialize for <a class=\"enum\" href=\"rfq/enum.Order.html\" title=\"enum rfq::Order\">Order</a>","synthetic":false,"types":["rfq::Order"]}];
if (window.register_implementors) {window.register_implementors(implementors);} else {window.pending_implementors = implementors;}})()