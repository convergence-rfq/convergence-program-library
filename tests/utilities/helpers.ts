// This function supresses solana error traces making test output clearer
export const expectError = async (promise: Promise<any>, errorText: string) => {
  // Disable error logs to prevent errors from blockchain validator spam
  const cachedStderrWrite = process.stdout.write;
  process.stderr.write = () => true;
  try {
    await promise;
    throw new Error(`No error thrown!`);
  } catch (e) {
    // Restore error logs
    process.stderr.write = cachedStderrWrite;

    if (!e?.message.includes(errorText) && !e?.logs?.some((e: string) => e.includes(errorText))) {
      throw e;
    }
  }
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
