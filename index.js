// A JS clone of Stephen Diehl's mini Parsec implementation
// from his excellent "Write You a Haskell" blog post series
// http://dev.stephendiehl.com/fun/002_parsers.html

const {
  Fn,
  Arr,
  Str,
  Applicanoid,
  implement,
  Chain,
  Apply,
  Functor
} = require("@masaeedu/fp");

// Utils
// Derived map, ap, lift2 etc from of and chain
const deriveMonad = Fn.pipe([
  implement(Chain),
  implement(Apply),
  implement(Functor),
  implement(Apply)
]);

const Char = (() => {
  // :: [Char]
  const digits = Arr.range(10).map(x => x.toString());
  // :: Char -> Bool
  const isDigit = c => digits.indexOf(c) !== -1;
  // :: Char -> Char -> Bool
  const equals = a => b => a === b;

  return { digits, isDigit, equals };
})();

// Parsing

// A parser is a function from a string to a number of
// possibly partial interpretations of that string
// :: type Parser a = String -> [(a, String)]
const Parser = (() => {
  // #################
  // ### INSTANCES ###
  // #################

  // Force a single interpretation of a string
  // without consuming any of it
  // :: x -> Parser x
  const of = x => s => [[x, s]];

  // Partially parse a string, then for every interpretation
  // generate a parser to parse the remainder of the string
  // under that interpretation
  // :: (a -> Parser b) -> Parser a -> Parser b
  const chain = f => p => s => Arr.foldMap(Arr)(([a, s_]) => f(a)(s_))(p(s));

  const { map, ap, lift2 } = deriveMonad({ of, chain });

  // Alternative
  const { empty: fail, append: tryBoth } = Applicanoid(Fn)(Arr);

  // :: Parser x
  const zero = fail;
  // :: Parser a -> Parser a -> Parser a
  const alt = pa => pb => s =>
    Arr.match({
      Cons: Arr.Cons,
      get Nil() {
        return pb(s);
      }
    })(pa(s));

  // ###################
  // ### COMBINATORS ###
  // ###################

  // :: Parser a -> Parser [a]
  const some = v => lift2(Arr.Cons)(v)(s => many(v)(s));
  // :: Parser a -> Parser [a]
  const many = v => alt(s => some(v)(s))(of([]));

  // :: Parser Char
  const item = Str.match({
    Nil: [],
    Cons: c => cs => [[c, cs]]
  });

  // :: (Char -> Bool) -> Parser Char
  const satisfy = p => chain(c => (p(c) ? of(c) : fail))(item);

  // :: [Char] -> Parser Char
  const oneOf = chars => satisfy(c => chars.indexOf(c) !== -1);

  // :: Parser a -> Parser (a -> a -> a) -> Parser a
  const chainl1 = p => op => {
    const rest = a => alt(chain(f => chain(b => rest(f(a)(b)))(p))(op))(of(a));
    return chain(rest)(p);
  };

  // :: Parser a -> Parser (a -> a -> a) -> a -> Parser a
  const chainl = p => op => a => alt(chainl1(p)(op))(of(a));

  // :: Char -> Parser Char
  const char = c => satisfy(Char.equals(c));

  // :: String -> Parser String
  const string = Str.match({
    Nil: of(Str.Nil),
    Cons: c => cs => chain(_ => map(_ => `${c}${cs}`)(string(cs)))(char(c))
  });

  // :: Parser a -> Parser a
  const token = p => chain(a => map(_ => a)(spaces))(p);

  // :: String -> Parser String
  const reserved = s => token(string(s));

  // :: Parser a -> Parser a
  const peek = p => s => chain(a => _ => of(a)(s))(p)(s);

  // :: Parser a -> Parser String
  const not = p => {
    const stop = map(_ => "")(peek(p));
    const more = lift2(Str.append)(item)(x => not(p)(x));

    return alt(end)(alt(stop)(more));
  };

  // ##################
  // ### PRIMITIVES ###
  // ##################

  // :: Parser String
  const end = s => (s === "" ? [["", ""]] : []);

  // :: Parser Char
  const space = oneOf([" ", "\n", "\r"]);

  // :: Parser String
  const spaces = map(ss => ss.join(""))(many(space));

  // :: Parser Char
  const lf = char("\n");

  // :: Parser Char
  const cr = char("\r");

  // :: Parser String
  const crlf = lift2(Str.append)(cr)(lf);

  // :: Parser String
  const eol = alt(lf)(crlf);

  // :: Parser Char
  const digit = satisfy(Char.isDigit);

  // :: Parser Nat
  const natural = map(ds => parseInt(ds.join("")))(some(digit));

  // :: Parser Integer
  const integer = chain(sign => map(ds => parseInt(`${sign}${ds}`))(natural))(
    alt(char("-"))(of(""))
  );

  // :: Parser String
  const line = lift2(Fn.const)(not(eol))(eol);

  // :: Parser [String]
  const lines = many(line);

  // :: Parser a -> Parser a
  const parens = m =>
    chain(_ => chain(n => map(_ => n)(reserved(")")))(m))(reserved("("));

  return {
    of,
    chain,
    map,
    ap,
    lift2,
    fail,
    tryBoth,
    zero,
    alt,
    some,
    many,
    item,
    satisfy,
    oneOf,
    chainl1,
    chainl,
    char,
    string,
    token,
    reserved,
    peek,
    not,
    end,
    space,
    spaces,
    lf,
    cr,
    crlf,
    eol,
    digit,
    natural,
    integer,
    line,
    lines,
    parens
  };
})();

module.exports = Parser;
