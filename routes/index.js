const express = require('express');
const axios = require('axios');

const router = express.Router();
const URL = 'http://localhost:8002/v1';

axios.defaults.headers.origin = 'http://localhost:4000'; // origin 헤더 추가

// API에 요청을 보내는 함수:
const request = async (req, api) => {
  try {
    // 세션에 토큰이 없으면:
    if (!req.session.jwt) {
      // 토큰을 발급받아서:
      const tokenResult = await axios.post(`${URL}/token`, {
        clientSecret: process.env.CLIENT_SECRET,
      });
      // 세션에 토큰 저장:
      req.session.jwt = tokenResult.data.token; 
    }
    return await axios.get(`${URL}${api}`, {
      headers: { authorization: req.session.jwt },
    }); // API 요청
  } catch (error) {
    // 토큰 만료되면(419error):
    if (error.response.status === 419) {
      // 토큰을 지우고:
      delete req.session.jwt;
      // request함수를 재귀적으로 호출해 다시 요청을 보낸다:
      return request(req, api);
    } // 419 외의 다른 에러면:
    return error.response;
  }
};

// API를 이용해 자신이 작성한 포스트를 JSON형식으로 가져오는 라우터:
router.get('/mypost', async (req, res, next) => {
  try {
    const result = await request(req, '/posts/my');
    res.json(result.data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// API를 사용해 해시태그를 검색하는 라우터:
router.get('/search/:hashtag', async (req, res, next) => {
  try {
    const result = await request(
      req, `/posts/hashtag/${encodeURIComponent(req.params.hashtag)}`,
    );
    res.json(result.data);
  } catch (error) {
    if (error.code) {
      console.error(error);
      next(error);
    }
  }
});

// 프런트 화면을 렌더링하는 라우터:
// router.get('/', renderMain)
router.get('/', (req, res) => {
  res.render('main', { key: process.env.CLIENT_SECRET });
});

module.exports = router;