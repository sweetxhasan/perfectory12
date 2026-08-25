declare module "node-id3" {
  function removeTagsFromBuffer(data: Buffer): Buffer | false

  const NodeID3: {
    removeTagsFromBuffer: typeof removeTagsFromBuffer
  }

  export { removeTagsFromBuffer }
  export default NodeID3
}
