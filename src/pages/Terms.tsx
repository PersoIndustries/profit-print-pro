import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Terms = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header variant="landing" />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t('terms.title')}</CardTitle>
            <p className="text-muted-foreground">{t('terms.lastUpdated')}: {new Date().toLocaleDateString(undefined)}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. {t('terms.section1.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section1.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. {t('terms.section2.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section2.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. {t('terms.section3.title')}</h2>
              <p className="text-muted-foreground mb-2">
                {t('terms.section3.intro')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('terms.section3.item1')}</li>
                <li>{t('terms.section3.item2')}</li>
                <li>{t('terms.section3.item3')}</li>
                <li>{t('terms.section3.item4')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. {t('terms.section4.title')}</h2>
              <p className="text-muted-foreground mb-2">
                {t('terms.section4.intro')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('terms.section4.item1')}</li>
                <li>{t('terms.section4.item2')}</li>
                <li>{t('terms.section4.item3')}</li>
                <li>{t('terms.section4.item4')}</li>
                <li>{t('terms.section4.item5')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. {t('terms.section5.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section5.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. {t('terms.section6.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section6.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. {t('terms.section7.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section7.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. {t('terms.section8.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section8.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. {t('terms.section9.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section9.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. {t('terms.section10.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section10.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. {t('terms.section11.title')}</h2>
              <p className="text-muted-foreground">
                {t('terms.section11.content')}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. {t('terms.section12.title')}</h2>
              <p className="text-muted-foreground mb-2">
                {t('terms.section12.content')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t('terms.section12.item1')}</li>
                <li>{t('terms.section12.item2')}</li>
                <li>{t('terms.section12.item3')}</li>
                <li>{t('terms.section12.item4')}</li>
                <li>{t('terms.section12.item5')}</li>
                <li>{t('terms.section12.item6')}</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
