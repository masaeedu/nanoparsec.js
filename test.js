const { adt, _ } = require("@masaeedu/fp");

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
    [char("a")    , "a -> b" , ["a", " -> b"]],
    [natural      , "123142" , [123142, ""]  ],
    [natural      , "abcd"   , []            ],
    [natural      , "123abcd", [123, "abcd"] ],
    [natural      , "-123"   , []            ],
    [integer      , "123"    , [123, ""]     ],
    [integer      , "-123"   , [-123, ""]    ],
    [string("foo"), "abcd"   , []            ],
    [string("foo"), "food"   , ["foo", "d"]  ],
    [spaces       , "  durr" , ["  ", "durr"]]
  ];

  const results = tests.map(([p, s]) => p(s));
  console.log(results);
}

// An example use case: parsing arithmetic expressions into an ADT
{
  const Expr = adt({ Add: [_, _], Mul: [_, _], Sub: [_, _], Lit: [_] });

  // :: Expr -> Int
  const eval = Expr.match({
    Add: a => b => eval(a) + eval(b),
    Mul: a => b => eval(a) * eval(b),
    Sub: a => b => eval(a) - eval(b),
    Lit: n => n
  });

  // :: Parser Expr
  const int = Parser.map(Expr.Lit)(integer);

  // :: Parser Expr
  const expr = s => chainl1(term)(addOp)(s);

  // :: Parser Expr
  const term = s => chainl1(factor)(mulOp)(s);

  // :: Parser Expr
  const factor = s => Parser.alt(int)(parens(expr))(s);

  // :: String -> (a -> a -> a) -> Parser (a -> a -> a)
  const infixOp = x => f => Parser.map(_ => f)(reserved(x));

  // :: Parser (Expr -> Expr -> Expr)
  const addOp = Parser.alt(infixOp("+")(Expr.Add))(infixOp("-")(Expr.Sub));

  // :: Parser (Expr -> Expr -> Expr)
  const mulOp = infixOp("*")(Expr.Mul);

  // prettier-ignore
  const tests = [
    "1+2*11",  // => [23, '']
    "(1+2)*11" // => [33, '']
  ];

  const results = tests.map(s => Parser.map(eval)(expr)(s));

  console.log(results);
}
