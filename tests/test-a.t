Setup

  $ export TERASTASH_COUNTERS_DIR="$(mktemp --tmpdir -d ts-test-a-state.XXXXXXXXXX)"
  $ mkdir -p /tmp/mychunks
  $ ts list-chunk-stores
  $ ts define-chunk-store mychunks -t localfs -d /tmp/mychunks -s '100*1024'
  $ ts destroy unit_tests_a > /dev/null 2>&1 || true # In case the last test run was ctrl-c'ed

Can add and drop a file

  $ ts ls
  File '([^\']+)' is not in a terastash working directory (re)
  [1]
  $ ts init unit_tests_a --chunk-store=mychunks
  $ ts list-chunk-stores
  mychunks
  $ ts get not-here
  No entry with parent=00000000000000000000000000000000 and basename='not-here'
  [1]
  $ ts get dir/not-here
  No entry with parent=00000000000000000000000000000000 and basename='dir'
  [1]
  $ echo -e "hello\nworld" > sample1
  $ touch --date=1970-01-01 sample1
  $ echo -e "second\nsample" > sample2
  $ touch --date=1980-01-01 sample2
  $ chmod +x sample2
  $ mkdir adir
  $ dd bs=1024 count=1024 if=/dev/zero of=adir/bigfile 2> /dev/null
  $ touch --date=1995-01-01 adir
  $ cat adir/bigfile | md5sum | cut -f 1 -d " "
  b6d81b360a5672d80c27430f39153e2c
  $ touch --date=1990-01-01 adir/bigfile
  $ ts add sample1 sample2 adir/bigfile
  $ ts add sample1 # can't add again
  Cannot add to database: 'sample1' in stash 'unit_tests_a' already exists as a file
  [1]
  $ mv adir adir.1
  $ touch adir
  $ ts add adir # can't add again
  Cannot add to database: 'adir' in stash 'unit_tests_a' already exists as a directory
  [1]
  $ rm adir
  $ mv adir.1 adir
  $ ts ls -n unit_tests_a
  When using -n/--name, a database path is required
  [1]
  $ ts ls
                   0 1995-01-01 00:00 adir/
                  12 1970-01-01 00:00 sample1
                  14 1980-01-01 00:00 sample2*
  $ ts ls -t
                   0 1995-01-01 00:00 adir/
                  14 1980-01-01 00:00 sample2*
                  12 1970-01-01 00:00 sample1
  $ ts ls -rt
                  12 1970-01-01 00:00 sample1
                  14 1980-01-01 00:00 sample2*
                   0 1995-01-01 00:00 adir/
  $ ts ls -j
  adir
  sample1
  sample2
  $ ts ls -rj
  sample2
  sample1
  adir
  $ ts ls -j -n unit_tests_a ''
  adir
  sample1
  sample2
  $ ts cat adir
  Path 'adir' in stash 'unit_tests_a' is not a file
  [1]
  $ ts cat sample1
  hello
  world
  $ ts cat sample1 sample2
  hello
  world
  second
  sample
  $ ts cat sample2 sample1
  second
  sample
  hello
  world
  $ rm -f sample1
  $ ls -1 sample1
  ls: cannot access sample1: No such file or directory
  [2]
  $ ts get sample1
  $ stat -c %y sample1
  1970-01-01 00:00:00.000000000 +0000
  $ cat sample1
  hello
  world
  $ rm sample1 adir/bigfile
  $ ts cat adir/bigfile > adir/bigfile.copy
  $ cat adir/bigfile.copy | md5sum | cut -f 1 -d " "
  b6d81b360a5672d80c27430f39153e2c
  $ ts get sample1 adir/bigfile # Make sure 'ts get' works with > 1 file
  $ stat -c %y sample1
  1970-01-01 00:00:00.000000000 +0000
  $ stat -c %y adir/bigfile
  1990-01-01 00:00:00.000000000 +0000
  $ ts dump-db
  {"~#Row":{"parent":"~bAAAAAAAAAAAAAAAAAAAAAQ==","basename":"bigfile","blake2b224":"~bqDSxkpHlSAi6g2fKYOar2cdEE4VBKEsSu2yqUw==","chunks_in_mychunks":[{"idx":0,"file_id":"deterministic-filename-0","md5":null,"crc32c":"~b48LuFQ==","size":{"~#Long":"102400"}},{"idx":1,"file_id":"deterministic-filename-1","md5":null,"crc32c":"~bCrR7Sg==","size":{"~#Long":"102400"}},{"idx":2,"file_id":"deterministic-filename-2","md5":null,"crc32c":"~bVW//Eg==","size":{"~#Long":"102400"}},{"idx":3,"file_id":"deterministic-filename-3","md5":null,"crc32c":"~bFug3SQ==","size":{"~#Long":"102400"}},{"idx":4,"file_id":"deterministic-filename-4","md5":null,"crc32c":"~boHMCAw==","size":{"~#Long":"102400"}},{"idx":5,"file_id":"deterministic-filename-5","md5":null,"crc32c":"~bTgPuIA==","size":{"~#Long":"102400"}},{"idx":6,"file_id":"deterministic-filename-6","md5":null,"crc32c":"~b0kilEQ==","size":{"~#Long":"102400"}},{"idx":7,"file_id":"deterministic-filename-7","md5":null,"crc32c":"~b35dApA==","size":{"~#Long":"102400"}},{"idx":8,"file_id":"deterministic-filename-8","md5":null,"crc32c":"~bvreN+Q==","size":{"~#Long":"102400"}},{"idx":9,"file_id":"deterministic-filename-9","md5":null,"crc32c":"~bB4umJw==","size":{"~#Long":"102400"}},{"idx":10,"file_id":"deterministic-filename-10","md5":null,"crc32c":"~bFmm9ow==","size":{"~#Long":"24576"}}],"content":null,"crtime":null,"executable":false,"key":"~bAAAAAAAAAAAAAAAAAAAAAA==","mtime":"~t1990-01-01T00:00:00.000Z","size":{"~#Long":"1048576"},"type":"f","uuid":null}}
  {"~#Row":{"parent":"~bAAAAAAAAAAAAAAAAAAAAAA==","basename":"adir","blake2b224":null,"chunks_in_mychunks":null,"content":null,"crtime":null,"executable":null,"key":null,"mtime":"~t1995-01-01T00:00:00.000Z","size":null,"type":"d","uuid":"~bAAAAAAAAAAAAAAAAAAAAAQ=="}}
  {"~#Row":{"parent":"~bAAAAAAAAAAAAAAAAAAAAAA==","basename":"sample1","blake2b224":"~b8fTjgJNl8/J4zGdDxIzJ9raMZ/C3DCok5tCw4Q==","chunks_in_mychunks":null,"content":"~baGVsbG8Kd29ybGQK","crtime":null,"executable":false,"key":null,"mtime":"~t1970-01-01T00:00:00.000Z","size":{"~#Long":"12"},"type":"f","uuid":null}}
  {"~#Row":{"parent":"~bAAAAAAAAAAAAAAAAAAAAAA==","basename":"sample2","blake2b224":"~b91UqIiWOC4GSfm1sthj+37PkP8fFJuzmd9Ffkg==","chunks_in_mychunks":null,"content":"~bc2Vjb25kCnNhbXBsZQo=","crtime":null,"executable":true,"key":null,"mtime":"~t1980-01-01T00:00:00.000Z","size":{"~#Long":"14"},"type":"f","uuid":null}}
  $ ts drop adir # Can't drop a non-empty directory
  Refusing to drop 'adir' because it is a non-empty directory
  [1]
  $ ts drop sample1 adir/bigfile adir
  $ ts ls
                  14 1980-01-01 00:00 sample2*
  $ ls -1F sample2
  sample2*
  $ rm sample2
  $ ts get sample2
  $ ls -1F sample2
  sample2*
  $ ts drop sample2
  $ ts ls

Parent directories are automatically created as needed

  $ mkdir -p d1/d2/d3
  $ touch d1/d2/d3/empty
  $ ts add d1/d2/d3/empty
  $ ts ls -j d1
  d2
  $ ts ls -j d1/d2
  d3
  $ ts ls -j d1/d2/d3
  empty
  $ ts drop d1/d2/d3/empty d1/d2/d3 d1/d2 d1

Dropping file again throws an error

  $ ts drop sample1
  No entry with parent=00000000000000000000000000000000 and basename='sample1'
  [1]
  $ ts ls

Dropping nonexistent file throws an error

  $ ts drop doesntexist
  No entry with parent=00000000000000000000000000000000 and basename='doesntexist'
  [1]
  $ ts ls

Can list stashes

  $ ts list-stashes | grep -P '^unit_tests_a$'
  unit_tests_a

Can destroy a terastash

  $ ts destroy unit_tests_a
  Destroyed keyspace and removed config for unit_tests_a.

Stash is not listed after being destroyed

  $ ts list-stashes | grep -P '^unit_tests_a$'
  [1]