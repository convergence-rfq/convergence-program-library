use crate::state::AccountTag;
use borsh::{BorshDeserialize, BorshSerialize};
use bytemuck::{Pod, Zeroable};
use num_derive::FromPrimitive;
use solana_program::pubkey::Pubkey;
use std::{cell::RefCell, rc::Rc};
// A Slab contains the data for a slab header and an array of nodes of a critbit tree
// whose leafs contain the data referencing an order of the orderbook.

////////////////////////////////////
// Nodes

#[doc(hidden)]
pub type NodeHandle = u32;

#[doc(hidden)]
pub type IoError = std::io::Error;

/// A critibit leaf node
#[derive(Debug, PartialEq, PartialOrd, Clone, Copy, Pod, Zeroable)]
#[repr(C)]
pub struct LeafNode {
    /// The key is the associated order id
    pub key: u128,
    /// A pointer into the underlying Slab to retrieve the node's associated callback info. The [`Slab::get_callback_info`] method can be used.
    pub callback_info_pt: u64,
    /// The quantity of base asset associated with the underlying order
    pub base_quantity: u64,
}

pub(crate) const NODE_SIZE: usize = 32;

pub(crate) const NODE_TAG_SIZE: usize = 8;

/// The size in bytes of a critbit slot
pub const SLOT_SIZE: usize = NODE_TAG_SIZE + NODE_SIZE;

impl LeafNode {
    /// Parse a leaf node's price
    pub fn price(&self) -> u64 {
        (self.key >> 64) as u64
    }

    /// Get the associated order id
    pub fn order_id(&self) -> u128 {
        self.key
    }
}

#[doc(hidden)]
#[derive(BorshDeserialize, BorshSerialize, Debug, PartialEq, Clone, Copy, Pod, Zeroable)]
#[repr(C)]
pub struct FreeNode {
    next: u32,
}

#[derive(Debug, PartialEq, Clone, FromPrimitive)]
pub(crate) enum NodeTag {
    Uninitialized,
    Inner,
    Leaf,
    Free,
    LastFree,
}

////////////////////////////////////
// Slabs

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
struct SlabHeader {
    account_tag: AccountTag,
    bump_index: u64,
    free_list_len: u64,
    free_list_head: u32,
    callback_memory_offset: u64,
    callback_free_list_len: u64,
    callback_free_list_head: u64,
    callback_bump_index: u64,

    root_node: u32,
    leaf_count: u64,
    market_address: Pubkey,
}
#[doc(hidden)]
pub const SLAB_HEADER_LEN: usize = 97;
#[doc(hidden)]
pub const PADDED_SLAB_HEADER_LEN: usize = SLAB_HEADER_LEN + 7;

/// A Slab contains the data for a slab header and an array of nodes of a critbit tree
/// whose leafs contain the data referencing an order of the orderbook.
#[derive(Clone)]
pub struct Slab<'a> {
    _header: SlabHeader,
    /// The underlying account data
    pub buffer: Rc<RefCell<&'a mut [u8]>>,
    #[doc(hidden)]
    pub callback_info_len: usize,
}
