const queue: (() => void)[] = [];
let active = 0;

const DELAY_MS = 600;
const MAX_CONCURRENT = 3;

function next() {
  active--;
  if (queue.length > 0) {
    const fn = queue.shift()!;
    setTimeout(() => {
      active++;
      fn();
    }, DELAY_MS);
  }
}

export function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    function run() {
      if (active < MAX_CONCURRENT) {
        active++;
        resolve();
      } else {
        queue.push(run);
      }
    }
    run();
  });
}

export function releaseSlot() {
  next();
}

