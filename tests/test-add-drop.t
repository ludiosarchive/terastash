Can add and drop a file

  $ mkdir -p /tmp/mychunks
  $ ts list-chunk-stores
  $ ts define-chunk-store mychunks -t localfs -d /tmp/mychunks -s '100*1024'
  $ ts destroy unit_tests_a > /dev/null 2>&1 || true # In case the last test run was ctrl-c'ed
  $ ts init unit_tests_a --chunk-store=mychunks
  $ ts list-chunk-stores
  mychunks
  $ ts get not-here
  Path 'not-here' not in stash 'unit_tests_a'
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
  {"~#Row":{"pathname":"sample2","blake2b224":"~b91UqIiWOC4GSfm1sthj+37PkP8fFJuzmd9Ffkg==","chunks_in_mychunks":null,"content":"~bc2Vjb25kCnNhbXBsZQo=","crtime":null,"executable":true,"key":null,"mtime":"~t1980-01-01T00:00:00.000Z","parent":"","size":{"~#Long":"14"},"type":"f"}}
  {"~#Row":{"pathname":"adir","blake2b224":null,"chunks_in_mychunks":null,"content":null,"crtime":null,"executable":null,"key":null,"mtime":"~t1995-01-01T00:00:00.000Z","parent":"","size":null,"type":"d"}}
  {"~#Row":{"pathname":"sample1","blake2b224":"~b8fTjgJNl8/J4zGdDxIzJ9raMZ/C3DCok5tCw4Q==","chunks_in_mychunks":null,"content":"~baGVsbG8Kd29ybGQK","crtime":null,"executable":false,"key":null,"mtime":"~t1970-01-01T00:00:00.000Z","parent":"","size":{"~#Long":"12"},"type":"f"}}
  {"~#Row":{"pathname":"adir/bigfile","blake2b224":"~bqDSxkpHlSAi6g2fKYOar2cdEE4VBKEsSu2yqUw==","chunks_in_mychunks":[{"idx":0,"file_id":"deterministic-filename-0-e3c2ee15","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":1,"file_id":"deterministic-filename-1-0ab47b4a","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":2,"file_id":"deterministic-filename-2-556fff12","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":3,"file_id":"deterministic-filename-3-16e83749","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":4,"file_id":"deterministic-filename-4-a0730203","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":5,"file_id":"deterministic-filename-5-4e03ee20","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":6,"file_id":"deterministic-filename-6-d248a511","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":7,"file_id":"deterministic-filename-7-df9740a4","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":8,"file_id":"deterministic-filename-8-beb78df9","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":9,"file_id":"deterministic-filename-9-078ba627","md5":null,"crc32c":null,"size":{"~#Long":"102400"}},{"idx":10,"file_id":"deterministic-filename-10-1669bda3","md5":null,"crc32c":null,"size":{"~#Long":"24576"}}],"content":null,"crtime":null,"executable":false,"key":"~bAAAAAAAAAAAAAAAAAAAAAA==","mtime":"~t1990-01-01T00:00:00.000Z","parent":"adir","size":{"~#Long":"1048576"},"type":"f"}}
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
  $ ts drop d1

Dropping file again is a no-op

  $ ts drop sample1
  $ ts ls

Dropping nonexistent file is a no-op

  $ ts drop doesntexist
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

Can store chunks in gdrive

  $ mkdir -p "$HOME/.config/terastash"
  $ cp -a "$REAL_HOME/.config/terastash/chunk-stores.json" "$HOME/.config/terastash/"
  $ cp -a "$REAL_HOME/.config/terastash/google-tokens.json" "$HOME/.config/terastash/"
  $ ts destroy unit_tests_b > /dev/null 2>&1 || true # In case the last test run was ctrl-c'ed
  $ ts init unit_tests_b --chunk-store=terastash-tests-gdrive "--chunk-threshold=10*10"
  $ ts config-chunk-store terastash-tests-gdrive --chunk-size=1024
  $ dd bs=1025 count=2 if=/dev/urandom of=smallfile 2> /dev/null
  $ MD5_BEFORE="$(cat smallfile | md5sum | cut -f 1 -d " ")"
  $ ts add smallfile
  $ rm smallfile
  $ ts get smallfile
  $ MD5_AFTER="$(cat smallfile | md5sum | cut -f 1 -d " ")"
  $ [[ "$MD5_BEFORE" == "$MD5_AFTER" ]]
