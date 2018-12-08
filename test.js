const { test } = require("ava");

const { adt, match } = require("@masaeedu/adt");

const Parser = require("./index.js");
const {
  char,
  natural,
  integer,
  string,
  spaces,
  reserved,
  chainl1,
  parens
} = Parser;

// Primitive tests
{
  // prettier-ignore
  const tests = [
    ['char("a")'    , char("a")    , "a -> b" , ["a", " -> b"]],
    ['natural'      , natural      , "123142" , [123142, ""]  ],
    ['natural'      , natural      , "abcd"   , []            ],
    ['natural'      , natural      , "123abcd", [123, "abcd"] ],
    ['natural'      , natural      , "-123"   , []            ],
    ['integer'      , integer      , "123"    , [123, ""]     ],
    ['integer'      , integer      , "-123"   , [-123, ""]    ],
    ['string("foo")', string("foo"), "abcd"   , []            ],
    ['string("foo")', string("foo"), "food"   , ["foo", "d"]  ],
    ['spaces'       , spaces       , "  durr" , ["  ", "durr"]]
  ];

  tests.map(([testname, parser, input]) => {
    test(`${testname}(${JSON.stringify(input)})`, t => {
      t.snapshot(parser(input));
    });
  });
}

// An example use case: parsing arithmetic expressions into an ADT
{
  const Expr = adt({
    Add: ["Expr", "Expr"],
    Mul: ["Expr", "Expr"],
    Sub: ["Expr", "Expr"],
    Lit: ["a"]
  });
  const { Add, Mul, Sub, Lit } = Expr;

  // :: Expr -> Int
  const evaluate = match({
    Add: a => b => evaluate(a) + evaluate(b),
    Mul: a => b => evaluate(a) * evaluate(b),
    Sub: a => b => evaluate(a) - evaluate(b),
    Lit: n => n
  });

  const { map, alt } = Parser;

  // :: Parser Expr
  const int = map(Lit)(integer);

  // :: Parser Expr
  const expr = s => chainl1(term)(addOp)(s);

  // :: Parser Expr
  const term = s => chainl1(factor)(mulOp)(s);

  // :: Parser Expr
  const factor = s => alt(int)(parens(expr))(s);

  // :: String -> (a -> a -> a) -> Parser (a -> a -> a)
  const infixOp = x => f => map(_ => f)(reserved(x));

  // :: Parser (Expr -> Expr -> Expr)
  const addOp = alt(infixOp("+")(Add))(infixOp("-")(Sub));

  // :: Parser (Expr -> Expr -> Expr)
  const mulOp = infixOp("*")(Mul);

  // prettier-ignore
  const tests = [
    "1+2*11",  // => [23, '']
    "(1+2)*11" // => [33, '']
  ];

  tests.forEach(s => {
    test(`map(evaluate)(expr)("${s}")`, t => {
      t.snapshot(map(evaluate)(expr)(s));
    });
  });
}

// Parsing lines
{
  const { eol, not, lines } = Parser;

  let tests = [];

  // EOL detection
  tests = [
    ...tests,
    ...["", "\n", "\r", "\r\n", "sadasd"].map(x => ["eol", eol, x])
  ];

  // Negative parsing
  tests = [
    ...tests,
    ...["", "\n", "abcd\n", "\r\n", "xyz\n123"].map(x => [
      "not(eol)",
      not(eol),
      x
    ])
  ];

  // Parsing lines
  const corpus = `
This is a test

another line
woot

`;
  tests = [...tests, ["lines", lines, corpus]];

  tests.map(([testname, parser, input]) => {
    test(`${testname}(${JSON.stringify(input)})`, t => {
      t.snapshot(parser(input));
    });
  });
}
